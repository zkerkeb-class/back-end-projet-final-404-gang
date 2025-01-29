const roles = {
  admin: ["read", "write", "delete"],
  user: ["read"],
};

const checkPermission = (role, action) => {
  return roles[role]?.includes(action);
};

module.exports = { checkPermission };
