const Pedigree = require("../models/pedigree");
const User = require("../models/user");
const { removeFile } = require("../utils/dir");
const { decodeToken } = require("../utils/jwt");
const { canModerate, isRoleModerator } = require("../utils/roles");

const pedigreeUppercaseFields = [
  "name",
  "beforeNameTitles",
  "afterNameTitles",
  "description",
  "owner",
  "breeder",
  "callname",
  "registration",
  "color",
  "conditioned_weight",
  "chain_weight",
];

const optionalTitleFields = ["beforeNameTitles", "afterNameTitles"];

const emptyTitleValues = new Set(["", "NULL", "UNDEFINED"]);

const normalizeOptionalTitle = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  return emptyTitleValues.has(trimmedValue.toUpperCase()) ? "" : trimmedValue;
};

const normalizePedigreeTextFields = (data) => {
  optionalTitleFields.forEach((field) => {
    data[field] = normalizeOptionalTitle(data[field]);
  });

  pedigreeUppercaseFields.forEach((field) => {
    if (typeof data[field] === "string") {
      data[field] = data[field].toUpperCase();
    }
  });

  return data;
};

const hideEmptyTitle = (value) =>
  typeof value === "string" && emptyTitleValues.has(value.trim().toUpperCase())
    ? ""
    : value;

const sanitizePedigreeTitles = (pedigree) => {
  if (!pedigree) {
    return pedigree;
  }

  [
    "beforeNameTitles",
    "afterNameTitles",
    "father_beforeNameTitles",
    "father_afterNameTitles",
    "mother_beforeNameTitles",
    "mother_afterNameTitles",
  ].forEach((field) => {
    pedigree[field] = hideEmptyTitle(pedigree[field]);
  });

  return pedigree;
};

const sanitizePedigreeListTitles = (pedigrees) =>
  pedigrees.map((pedigree) => sanitizePedigreeTitles(pedigree));

const toUppercase = (value) =>
  typeof value === "string" ? value.toUpperCase() : value;

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getPedigreeFullName = (pedigree) =>
  [
    pedigree.beforeNameTitles,
    pedigree.name,
    pedigree.afterNameTitles,
  ]
    .filter((value) => typeof value === "string" && value.trim() !== "")
    .join(" ");

const getRequestOrigin = (req) => {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const forwardedHost = req.headers["x-forwarded-host"];
  const protocol =
    (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto)
      ?.split(",")[0]
      ?.trim() ||
    req.protocol ||
    "https";
  const host =
    (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ||
    req.get("host");

  return `${protocol}://${host}`;
};

const getFrontendBaseUrl = () =>
  (process.env.FRONTEND_URL || "https://www.apbtpedigree.com").replace(
    /\/$/,
    ""
  );

const encodePathPart = (value) =>
  String(value)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

const getPedigreeImageUrl = (req, image) => {
  if (typeof image === "string" && /^https?:\/\//i.test(image)) {
    return image;
  }

  if (typeof image === "string" && image.trim() !== "") {
    return `${getRequestOrigin(req)}${req.baseUrl}/uploads/pedigrees/${encodePathPart(
      image.trim()
    )}`;
  }

  return `${getFrontendBaseUrl()}/dog.png`;
};

const getShareTargetUrl = (id, view) => {
  const path =
    view === "private"
      ? `/pedigree/my-pedigrees/${id}`
      : `/public/pedigree/${id}`;

  return `${getFrontendBaseUrl()}${path}`;
};

const renderPedigreeShareHtml = ({ title, description, imageUrl, shareUrl, targetUrl }) => `<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(targetUrl)}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="APBT Online Pedigree Database" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(shareUrl)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:alt" content="${escapeHtml(title)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
    <meta http-equiv="refresh" content="0; url=${escapeHtml(targetUrl)}" />
    <script>
      window.location.replace(${JSON.stringify(targetUrl)});
    </script>
  </head>
  <body>
    <a href="${escapeHtml(targetUrl)}">View pedigree</a>
  </body>
</html>`;

const pedigreeSearchIgnoredCharacters = [
  " ",
  "\t",
  "\r",
  "\n",
  "!",
  '"',
  "#",
  "$",
  "%",
  "&",
  "'",
  "(",
  ")",
  "*",
  "+",
  ",",
  "-",
  ".",
  "/",
  ":",
  ";",
  "<",
  "=",
  ">",
  "?",
  "@",
  "[",
  "\\",
  "]",
  "^",
  "_",
  "`",
  "{",
  "|",
  "}",
  "~",
  "’",
  "‘",
  "“",
  "”",
  "¡",
  "¿",
];

const toSqlCharacter = (character) => {
  if (character === "'") {
    return "CHAR(39)";
  }

  if (character === "\\") {
    return "CHAR(92)";
  }

  if (character === "\t") {
    return "CHAR(9)";
  }

  if (character === "\r") {
    return "CHAR(13)";
  }

  if (character === "\n") {
    return "CHAR(10)";
  }

  return `'${character}'`;
};

const normalizePedigreeSearchSql = (field) =>
  pedigreeSearchIgnoredCharacters.reduce(
    (expression, character) =>
      `REPLACE(${expression}, ${toSqlCharacter(character)}, '')`,
    `UPPER(${field})`
  );

const normalizePedigreeSearchName = (value) =>
  typeof value === "string"
    ? value.toUpperCase().replace(/[^\p{L}\p{N}]/gu, "")
    : value;

module.exports = {
  index: async (req, res) => {
    const {
      page,
      size,
      orderBy,
      registeredName,
      dogId,
      registrationNumber,
      callname,
      breeder,
      owner,
      ownerUsername,
      ownerId,
      userId,
      superUsersOnly,
    } = req.query;

    let condition = "";
    const params = [];

    if (
      dogId !== undefined &&
      dogId !== "" &&
      !/^\d+$/.test(String(dogId))
    ) {
      return res
        .status(200)
        .send({ response: { data: [], totalRows: 0 } });
    }

    const { authorization } = req.headers;
    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    if (registeredName) {
      condition = ` WHERE ${normalizePedigreeSearchSql(
        "pedigree.name"
      )} LIKE ?`;
      params.push(`%${normalizePedigreeSearchName(registeredName)}%`);
    }
    if (dogId) {
      condition = ` WHERE pedigree.id = ?`;
      params.push(dogId);
    }
    if (registrationNumber) {
      condition = ` WHERE pedigree.registrationNumber LIKE ?`;
      params.push(`%${toUppercase(registrationNumber)}%`);
    }
    if (callname) {
      condition = ` WHERE pedigree.callname LIKE ?`;
      params.push(`%${toUppercase(callname)}%`);
    }
    if (breeder) {
      condition = ` WHERE pedigree.breeder LIKE ?`;
      params.push(`%${toUppercase(breeder)}%`);
    }
    if (owner) {
      condition = ` WHERE pedigree.owner LIKE ?`;
      params.push(`%${toUppercase(owner)}%`);
    }
    if (ownerUsername) {
      condition = ` WHERE pedigree.user_id IN (SELECT id FROM users WHERE username LIKE ?)`;
      params.push(`%${ownerUsername}%`);
    }
    if (superUsersOnly === "true") {
      if (!canModerate(user)) {
        return res
          .status(403)
          .send({ response: "No tienes permiso para listar estos Pedigrees" });
      }

      condition = ` WHERE pedigree.user_id IN (SELECT id FROM users WHERE is_superuser = true)`;
    } else if (ownerId || userId) {
      condition = ` WHERE pedigree.user_id = ?`;
      params.push(ownerId || userId);
    }

    const offset = page * size;

    try {
      const pedigreesCount = await Pedigree.getCount(
        req.con,
        params,
        condition
      ).then((rows) => rows[0].count);

      condition += ` ORDER BY pedigree.${orderBy} LIMIT ${size} OFFSET ${offset}`;

      Pedigree.get(req.con, params, condition, (error, rows) => {
        if (error) {
          return res.status(500).send({
            response: "Ha ocurrido un error listando los pedigrees: " + error,
          });
        } else {
          return res
            .status(200)
            .send({
              response: {
                data: sanitizePedigreeListTitles(rows),
                totalRows: pedigreesCount,
              },
            });
        }
      });
    } catch (error) {
      return res.status(500).send({
        response: "Ha ocurrido un error listando los pedigrees: " + error,
      });
    }
  },
  share: async (req, res) => {
    const { id } = req.params;
    const view = req.query.view === "private" ? "private" : "public";

    try {
      const pedigree = await Pedigree.getById(req.con, id).then(
        (rows) => rows[0]
      );

      if (!pedigree) {
        return res.status(404).send("Pedigree not found");
      }

      sanitizePedigreeTitles(pedigree);

      const pedigreeName = getPedigreeFullName(pedigree) || "APBT Pedigree";
      const title = `${pedigreeName} - APBT Pedigree`;
      const description = `View ${pedigreeName} pedigree, bloodline, sire, dam, offspring, and related records.`;
      const imageUrl = getPedigreeImageUrl(req, pedigree.img);
      const targetUrl = getShareTargetUrl(pedigree.id, view);

      res.set("Content-Type", "text/html; charset=utf-8");
      res.set("Cache-Control", "public, max-age=300");
      return res
        .status(200)
        .send(
          renderPedigreeShareHtml({
            title,
            description,
            imageUrl,
            shareUrl: targetUrl,
            targetUrl,
          })
        );
    } catch (error) {
      return res.status(500).send("Error loading pedigree share preview");
    }
  },
  getById: async (req, res) => {
    const { id } = req.params;

    try {
      const pedigree = await Pedigree.getById(req.con, id).then(
        (rows) => rows[0]
      );

      sanitizePedigreeTitles(pedigree);

      Pedigree.updateViewsCount(req.con, id, (error, rows) => {});

      let generation1 = [];
      let generation2 = [];
      let generation3 = [];
      let generation4 = [];

      generation1 = await getParents(
        req.con,
        pedigree.father_id,
        pedigree.mother_id
      );

      for (let i = 0; i < generation1.length; i++) {
        if (generation1[i] != undefined) {
          const parents = await getParents(
            req.con,
            generation1[i].father_id,
            generation1[i].mother_id
          );
          generation2 = generation2.concat(parents);
        } else {
          generation2 = generation2.concat([undefined, undefined]);
        }
      }

      for (let i = 0; i < generation2.length; i++) {
        if (generation2[i] != undefined) {
          const parents = await getParents(
            req.con,
            generation2[i].father_id,
            generation2[i].mother_id
          );
          generation3 = generation3.concat(parents);
        } else {
          generation3 = generation3.concat([undefined, undefined]);
        }
      }

      for (let i = 0; i < generation3.length; i++) {
        if (generation3[i] != undefined) {
          const parents = await getParents(
            req.con,
            generation3[i].father_id,
            generation3[i].mother_id
          );
          generation4 = generation4.concat(parents);
        } else {
          generation4 = generation4.concat([undefined, undefined]);
        }
      }

      const siblings = await Pedigree.getBrothers(
        req.con,
        pedigree.id,
        pedigree.father_id,
        pedigree.mother_id
      );

      const offsprings = await Pedigree.getChildren(req.con, pedigree.id);

      return res.status(200).send({
        response: {
          pedigree,
          siblings: sanitizePedigreeListTitles(siblings),
          offsprings: sanitizePedigreeListTitles(offsprings),
          generation1: sanitizePedigreeListTitles(generation1),
          generation2: sanitizePedigreeListTitles(generation2),
          generation3: sanitizePedigreeListTitles(generation3),
          generation4: sanitizePedigreeListTitles(generation4),
        },
      });
    } catch (error) {
      return res.status(500).send({
        response:
          "Ha ocurrido un error trayendo el pedigree con id: " +
          id +
          " error: " +
          error,
      });
    }
  },

  store: async (req, res) => {
    req.body.img = "";

    if (req.file) {
      req.body.img = req.file.filename;
    }

    normalizePedigreeTextFields(req.body);

    console.log(req.body);

    Pedigree.savePedigree(req.con, req.body, (error, rows) => {
      if (error) {
        if (req.body.img) {
          removeFile(`pedigrees/${req.body.img}`);
        }
        res.status(500).send({
          response:
            "Ha ocurrido un error guardando el pedigree, error: " + error,
        });
      } else {
        req.io.emit("pedigreeRegistered", { reload: true });
        res.status(200).send({ response: rows });
      }
    });
  },

  update: async (req, res) => {
    const { id } = req.params;
    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    try {
      const pedigree = await Pedigree.getById(req.con, id).then(
        (rows) => rows[0]
      );

      if (!pedigree) {
        return res.status(404).send({ response: "Pedigree no encontrado" });
      }

      if (pedigree.user_id !== user.id && !canModerate(user)) {
        return res
          .status(403)
          .send({ response: "No tienes permiso para editar este Pedigree" });
      }

      if (req.file) {
        req.body.img = req.file.filename;
        if (req.body.old_img) {
          removeFile(`pedigrees/${req.body.old_img}`);
        }
      }

      normalizePedigreeTextFields(req.body);

      Pedigree.updatePedigree(req.con, req.body, id, (error, rows) => {
        if (error) {
          console.log(error);

          res.status(500).send({
            response:
              "Ha ocurrido un error actualizando el pedigree, error: " + error,
          });
        } else {
          res.status(200).send({ response: rows });
        }
      });
    } catch (error) {
      return res
        .status(500)
        .send({ response: "Error al actualizar el Pedigree" });
    }
  },

  delete: async (req, res) => {
    const { id } = req.params;
    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    try {
      const pedigree = await Pedigree.getById(req.con, id).then(
        (rows) => rows[0]
      );

      if (!pedigree) {
        return res.status(404).send({ response: "Pedigree no encontrado" });
      }

      if (isRoleModerator(user) && !user.is_superuser) {
        return res
          .status(403)
          .send({ response: "No tienes permiso para eliminar este Pedigree" });
      }

      if (pedigree.user_id !== user.id && !user.is_superuser) {
        return res
          .status(403)
          .send({ response: "No tienes permiso para editar este Pedigree" });
      }

      Pedigree.delete(req.con, id, (error, row) => {
        if (error) {
          return res
            .status(500)
            .send({ response: "Error al eliminar el Pedigree" });
        } else {
          return res.status(200).send({ response: row });
        }
      });
    } catch (error) {
      return res
        .status(500)
        .send({ response: "Error al actualizar el Pedigree" });
    }
  },

  changeOwner: async (req, res) => {
    const { id } = req.params;
    const { newOwner, description } = req.body;
    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const userData = decodeToken(token).user;

    try {
      const pedigree = await Pedigree.getById(req.con, id).then(
        (rows) => rows[0]
      );

      if (!pedigree) {
        return res.status(404).send({ response: "Pedigree no encontrado" });
      }

      if (pedigree.user_id !== userData.id && !canModerate(userData)) {
        return res
          .status(403)
          .send({ response: "No tienes permiso para editar este Pedigree" });
      }

      const user = await new Promise((resolve, reject) => {
        User.getById(req.con, newOwner, (error, row) => {
          if (error) return reject(error);
          resolve(row);
        });
      });

      if (!user.length) {
        return res.status(404).send({ response: "El usuario no existe" });
      }

      const updated = Pedigree.changeOwnership(
        req.con,
        id,
        user[0].id,
        user[0].username,
        description
      );

      if (updated) {
        return res
          .status(200)
          .send({ response: "Pedigree actualizado correctamente" });
      }
    } catch (error) {
      return res
        .status(500)
        .send({ response: "Error al actualizar el Pedigree" });
    }
  },

  changePermissions: async (req, res) => {
    const { id } = req.params;
    const { private } = req.body;
    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    try {
      const pedigree = await Pedigree.getById(req.con, id).then(
        (rows) => rows[0]
      );

      if (!pedigree) {
        return res.status(404).send({ response: "Pedigree no encontrado" });
      }

      if (pedigree.user_id !== user.id && !canModerate(user)) {
        return res
          .status(403)
          .send({ response: "No tienes permiso para editar este Pedigree" });
      }

      pedigree.private = private;

      Pedigree.changePermissions(req.con, private, id, (error, row) => {
        if (error) {
          return res
            .status(500)
            .send({ response: "Error al actualizar el Pedigree" });
        } else {
          return res
            .status(200)
            .send({ response: "Pedigree actualizado correctamente", pedigree });
        }
      });
    } catch (error) {
      return res
        .status(500)
        .send({ response: "Error al actualizar el Pedigree" });
    }
  },

  updateImg: async (req, res) => {
    const { id } = req.params;
    const { authorization } = req.headers;

    const token = authorization.replace("Bearer ", "");
    const user = decodeToken(token).user;

    try {
      const pedigree = await Pedigree.getById(req.con, id).then(
        (rows) => rows[0]
      );

      if (!pedigree) {
        return res.status(404).send({ response: "Pedigree no encontrado" });
      }

      if (pedigree.user_id !== user.id && !canModerate(user)) {
        return res
          .status(403)
          .send({ response: "No tienes permiso para editar este Pedigree" });
      }

      req.body.img = "";

      if (req.body.old_img) {
        removeFile(`pedigrees/${req.body.old_img}`);
      }

      if (req.file) {
        req.body.img = req.file.filename;
      }

      Pedigree.updateImg(req.con, req.body.img, id, (error, rows) => {
        if (error) {
          res.status(500).send({
            response:
              "Ha ocurrido un error actualizando el pedigree, error: " + error,
          });
        } else {
          res.status(200).send({ response: rows });
        }
      });
    } catch (error) {
      return res
        .status(500)
        .send({ response: "Error al actualizar el Pedigree" });
    }
  },
  getLogs: (req, res) => {
    const { id } = req.params;
    Pedigree.getLogs(req.con, id, (error, rows) => {
      if (error) {
        res.status(500).send({
          response:
            "Ha ocurrido un error listando los logs del pedigree, error: " +
            error,
        });
      } else {
        res.status(200).send({ response: rows });
      }
    });
  },
};

const getParents = async (con, idFather, idMother) => {
  const father = await Pedigree.getFather(con, idFather).then(
    (rows) => rows[0]
  );
  const mother = await Pedigree.getMother(con, idMother).then(
    (rows) => rows[0]
  );

  return [father, mother];
};
