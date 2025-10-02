const games = {};

// Save state game
function setGame(chatId, gameName, data) {
  if (!games[chatId]) games[chatId] = {};
  games[chatId][gameName] = data;
}

// Get state game
function getGame(chatId, gameName) {
  return games[chatId]?.[gameName];
}

// Delete state game
function clearGame(chatId, gameName) {
  if (games[chatId]) delete games[chatId][gameName];
}

// Check the answers to all active games
async function checkAnswer(ctx) {
  const chatId = ctx.chat.id;
  const text = ctx.message.text.trim().toLowerCase();

  const activeGames = games[chatId];
  if (!activeGames) return;

  for (const [gameName, gameData] of Object.entries(activeGames)) {
    // 🧠 Normal single-answer game
    if (gameData.answer && text === gameData.answer.toLowerCase()) {
      await ctx.reply(
        `✅ Correct! ${ctx.from.first_name} got it right!\nThe answer is *${gameData.answer}*`,
        { parse_mode: "Markdown" }
      );
      clearGame(chatId, gameName);
      return;
    }

    // 👨‍👩‍👧 Family100 (multi-answer)
    if (gameData.answers) {
      if (gameData.found.includes(text)) return;

      if (gameData.answers.includes(text)) {
        gameData.found.push(text);

        await ctx.reply(
          `✅ ${ctx.from.first_name} found one: *${text}* (${gameData.found.length}/${gameData.answers.length})`,
          { parse_mode: "Markdown" }
        );

        if (gameData.found.length === gameData.answers.length) {
          await ctx.reply(
            `🎉 All answers have been found!\nThe answers were:\n- ${gameData.answers.join("\n- ")}`,
            { parse_mode: "Markdown" }
          );
          clearGame(chatId, gameName);
        }

        return;
      }
    }
  }
}

module.exports = { setGame, getGame, clearGame, checkAnswer };
