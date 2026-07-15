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

const allowedPedigreeOrderByFields = new Set([
  "id ASC",
  "id DESC",
  "name ASC",
  "name DESC",
  "created_at ASC",
  "created_at DESC",
  "updated_at ASC",
  "updated_at DESC",
  "seen ASC",
  "seen DESC",
]);

const getSafePositiveInteger = (value, fallback, maxValue) => {
  const number = Number(value);

  if (!Number.isInteger(number) || number < 0) {
    return fallback;
  }

  return typeof maxValue === "number" ? Math.min(number, maxValue) : number;
};

const getSafePedigreeOrderBy = (orderBy) =>
  allowedPedigreeOrderByFields.has(orderBy) ? orderBy : "id ASC";

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escapeXml = escapeHtml;

const escapeJsonForHtml = (value) =>
  JSON.stringify(value).replace(/</g, "\\u003c");

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

const formatDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString().split("T")[0];
};

const formatDateTime = (value) => {
  if (!value) {
    return new Date().toISOString();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const getPedigreeDescription = (pedigree, pedigreeName) => {
  const details = [
    pedigree.color ? `Color: ${pedigree.color}` : "",
    pedigree.sex ? `Sex: ${pedigree.sex}` : "",
    pedigree.owner ? `Owner: ${pedigree.owner}` : "",
    pedigree.breeder ? `Breeder: ${pedigree.breeder}` : "",
  ].filter(Boolean);

  return details.length
    ? `${pedigreeName} APBT pedigree. ${details.join(". ")}.`
    : `View ${pedigreeName} APBT pedigree, bloodline, sire, dam, offspring, and related records.`;
};

const getPedigreeStructuredData = ({
  pedigree,
  title,
  description,
  imageUrl,
  targetUrl,
}) => {
  const pedigreeName = getPedigreeFullName(pedigree) || "APBT Pedigree";
  const animal = {
    "@type": "Animal",
    "@id": `${targetUrl}#dog`,
    name: pedigreeName,
    species: "Dog",
    breed: "American Pit Bull Terrier",
    image: imageUrl,
    url: targetUrl,
  };

  if (pedigree.sex) animal.gender = pedigree.sex;
  if (pedigree.color) animal.color = pedigree.color;
  if (pedigree.birthdate) animal.birthDate = formatDate(pedigree.birthdate);

  const webpage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${targetUrl}#webpage`,
    url: targetUrl,
    name: title,
    description,
    image: {
      "@type": "ImageObject",
      url: imageUrl,
      caption: title,
    },
    isPartOf: {
      "@type": "WebSite",
      name: "APBT Online Pedigree Database",
      url: `${getFrontendBaseUrl()}/`,
    },
    mainEntity: animal,
  };

  return webpage;
};

const renderPedigreeHtml = ({
  title,
  description,
  imageUrl,
  shareUrl,
  targetUrl,
  pedigree,
  shouldRedirect = false,
  robotsContent = "index, follow, max-snippet:-1, max-image-preview:large",
}) => `<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="${escapeHtml(robotsContent)}" />
    <meta name="googlebot" content="${escapeHtml(robotsContent)}" />
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
    <script type="application/ld+json">${escapeJsonForHtml(
      getPedigreeStructuredData({
        pedigree,
        title,
        description,
        imageUrl,
        targetUrl,
      })
    )}</script>
    ${
      shouldRedirect
        ? `<meta http-equiv="refresh" content="0; url=${escapeHtml(
            targetUrl
          )}" />
    <script>window.location.replace(${JSON.stringify(targetUrl)});</script>`
        : ""
    }
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" />
      <p><a href="${escapeHtml(targetUrl)}">View pedigree</a></p>
    </main>
  </body>
</html>`;

const getPedigreeSeoPayload = (req, pedigree, view = "public") => {
  sanitizePedigreeTitles(pedigree);

  const pedigreeName = getPedigreeFullName(pedigree) || "APBT Pedigree";
  const title = `${pedigreeName} - APBT Pedigree`;
  const description = getPedigreeDescription(pedigree, pedigreeName);
  const imageUrl = getPedigreeImageUrl(req, pedigree.img);
  const targetUrl = getShareTargetUrl(pedigree.id, view);

  return {
    pedigree,
    title,
    description,
    imageUrl,
    targetUrl,
  };
};

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

  if (character === "?") {
    return "CHAR(63)";
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

const getValidPedigreeId = (value) => {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
};

const getParentIds = (pedigrees) => {
  const ids = new Set();

  pedigrees.forEach((pedigree) => {
    if (!pedigree) {
      return;
    }

    const fatherId = getValidPedigreeId(pedigree.father_id);
    const motherId = getValidPedigreeId(pedigree.mother_id);

    if (fatherId) ids.add(fatherId);
    if (motherId) ids.add(motherId);
  });

  return Array.from(ids);
};

const getParentGeneration = async (con, pedigrees) => {
  const parentIds = getParentIds(pedigrees);
  const parents = await Pedigree.getByIds(con, parentIds);
  const parentsById = new Map(
    parents.map((parent) => [Number(parent.id), sanitizePedigreeTitles(parent)])
  );

  return pedigrees.flatMap((pedigree) => {
    if (!pedigree) {
      return [undefined, undefined];
    }

    const fatherId = getValidPedigreeId(pedigree.father_id);
    const motherId = getValidPedigreeId(pedigree.mother_id);

    return [
      fatherId ? parentsById.get(fatherId) : undefined,
      motherId ? parentsById.get(motherId) : undefined,
    ];
  });
};

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

    const safePage = getSafePositiveInteger(page, 0);
    const safeSize = getSafePositiveInteger(size, 50, 100);
    const safeOrderBy = getSafePedigreeOrderBy(orderBy);
    const offset = safePage * safeSize;

    try {
      const listCondition = `${condition} ORDER BY pedigree.${safeOrderBy} LIMIT ? OFFSET ?`;
      const [countRows, rows] = await Promise.all([
        Pedigree.getCount(req.con, params, condition),
        Pedigree.getAsync(req.con, [...params, safeSize, offset], listCondition),
      ]);
      const pedigreesCount = countRows[0].count;

      return res.status(200).send({
        response: {
          data: sanitizePedigreeListTitles(rows),
          totalRows: pedigreesCount,
        },
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

    if (!/^\d+$/.test(String(id))) {
      return res.status(404).send("Pedigree not found");
    }

    try {
      const pedigree = await Pedigree.getById(req.con, id).then(
        (rows) => rows[0]
      );

      if (!pedigree) {
        return res.status(404).send("Pedigree not found");
      }

      const { title, description, imageUrl, targetUrl } = getPedigreeSeoPayload(
        req,
        pedigree,
        view
      );

      res.set("Content-Type", "text/html; charset=utf-8");
      res.set("Cache-Control", "public, max-age=300");
      return res
        .status(200)
        .send(
          renderPedigreeHtml({
            title,
            description,
            imageUrl,
            shareUrl: targetUrl,
            targetUrl,
            pedigree,
            shouldRedirect: true,
            robotsContent:
              view === "private"
                ? "noindex, follow"
                : "index, follow, max-snippet:-1, max-image-preview:large",
          })
        );
    } catch (error) {
      return res.status(500).send("Error loading pedigree share preview");
    }
  },
  seo: async (req, res) => {
    const { id } = req.params;
    const view = req.query.view === "private" ? "private" : "public";

    if (!/^\d+$/.test(String(id))) {
      return res.status(404).send("Pedigree not found");
    }

    try {
      const pedigree = await Pedigree.getById(req.con, id).then(
        (rows) => rows[0]
      );

      if (!pedigree) {
        return res.status(404).send("Pedigree not found");
      }

      const { title, description, imageUrl, targetUrl } = getPedigreeSeoPayload(
        req,
        pedigree,
        view
      );

      res.set("Content-Type", "text/html; charset=utf-8");
      res.set("Cache-Control", "public, max-age=900");
      return res.status(200).send(
        renderPedigreeHtml({
          title,
          description,
          imageUrl,
          shareUrl: targetUrl,
          targetUrl,
          pedigree,
          robotsContent:
            view === "private"
              ? "noindex, follow"
              : "index, follow, max-snippet:-1, max-image-preview:large",
        })
      );
    } catch (error) {
      return res.status(500).send("Error loading pedigree SEO page");
    }
  },
  sitemap: async (req, res) => {
    try {
      const pedigrees = await Pedigree.getPublicSitemapRows(req.con);
      const urlNodes = pedigrees
        .map((pedigree) => {
          sanitizePedigreeTitles(pedigree);

          const title =
            getPedigreeFullName(pedigree) || `APBT Pedigree ${pedigree.id}`;
          const loc = `${getFrontendBaseUrl()}/public/pedigree/${pedigree.id}`;
          const imageUrl = getPedigreeImageUrl(req, pedigree.img);
          const lastmod = formatDateTime(
            pedigree.updated_at || pedigree.created_at
          );

          return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>${escapeXml(imageUrl)}</image:loc>
      <image:title>${escapeXml(title)}</image:title>
      <image:caption>${escapeXml(`${title} APBT pedigree`)}</image:caption>
    </image:image>
  </url>`;
        })
        .join("\n");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlNodes}
</urlset>`;

      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600");
      return res.status(200).send(xml);
    } catch (error) {
      return res.status(500).send("Error generating sitemap");
    }
  },
  getById: async (req, res) => {
    const { id } = req.params;
    const pedigreeId = getValidPedigreeId(id);

    if (!pedigreeId) {
      return res.status(404).send({ response: "Pedigree no encontrado" });
    }

    try {
      const pedigree = await Pedigree.getById(req.con, pedigreeId).then(
        (rows) => rows[0]
      );

      if (!pedigree) {
        return res.status(404).send({ response: "Pedigree no encontrado" });
      }

      sanitizePedigreeTitles(pedigree);

      Pedigree.updateViewsCount(req.con, pedigreeId, () => {});

      const [generation1, siblings, offsprings] = await Promise.all([
        getParentGeneration(req.con, [pedigree]),
        Pedigree.getBrothers(
          req.con,
          pedigree.id,
          pedigree.father_id,
          pedigree.mother_id
        ),
        Pedigree.getChildren(req.con, pedigree.id),
      ]);
      const generation2 = await getParentGeneration(req.con, generation1);
      const generation3 = await getParentGeneration(req.con, generation2);
      const generation4 = await getParentGeneration(req.con, generation3);

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
