const userModelSelection = {};

function getUserModel(chatId) {
  return userModelSelection[chatId];
}

function setUserModel(chatId, modelId) {
  userModelSelection[chatId] = modelId;
}

module.exports = {
  getUserModel,
  setUserModel
};