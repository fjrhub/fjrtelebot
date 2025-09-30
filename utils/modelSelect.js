const userModelSelection = {
  privat: "compound-beta",
  authorized: "compound-beta-mini",
};

function getModelByRole(chatId) {
  const { privat, isAuthorized } = require("@/utils/helper");

  if (privat(chatId)) return userModelSelection.privat;
  if (isAuthorized(chatId)) return userModelSelection.authorized;
  return null;
}

function setModel(role, modelId) {
  if (role === "privat" || role === "authorized") {
    userModelSelection[role] = modelId;
  }
}

module.exports = {
  getModelByRole,
  setModel,
  userModelSelection,
};