function isAdmin(user) {
  return Boolean(user?.is_superuser);
}

function isRoleModerator(user) {
  return Boolean(user?.is_moderator);
}

function canModerate(user) {
  return isAdmin(user) || isRoleModerator(user);
}

module.exports = {
  canModerate,
  isAdmin,
  isRoleModerator,
};
