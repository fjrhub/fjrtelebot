const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { privat } = require("@/utils/helper");

module.exports = {
  name: "ytm",
  description: "Download audio only from YouTube using yt-dlp",
  async execute(bot, msg) {
    const chatId = msg.chat.id;
    if (!privat(chatId)) return;

    const text = msg.text || "";
    const args = text.split(" ");

    if (args.length < 2) {
      return bot.sendMessage(
        chatId,
        "Please provide a link after the command, for example:\n`/yt https://youtu.be/abc123`",
        { parse_mode: "Markdown" }
      );
    }

    const url = args[1];
    const outputFolder = path.join(__dirname, "../../yt-dlp");

    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    const format = "251/bestaudio[ext=webm]/bestaudio";

    const cmdArgs = [
      "-f",
      format,
      "--sponsorblock-remove",
      "all",
      "--no-mtime",
      "--restrict-filenames",
      "-o",
      `${outputFolder}/%(title)s.%(ext)s`,
      url,
    ];

    const statusMessage = await bot.sendMessage(
      chatId,
      "Downloading the audio, please wait..."
    );

    let videoTitle = null;

    const ytProcess = spawn("yt-dlp", cmdArgs);

    ytProcess.stdout.on("data", (data) => {
      const output = data.toString();
      console.log(output);

      const match = output.match(
        /Destination:\s*(.+\/)?(.+)\.(webm|m4a|mp3|opus)/i
      );
      if (match && !videoTitle) {
        videoTitle = match[2]
          .replace(/\.f\d{2,4}$/, "")
          .replace(/_/g, " ")
          .trim();
      }
    });

    ytProcess.stderr.on("data", (data) => {
      console.error(`${data.toString()}`);
    });

    ytProcess.on("close", async (code) => {
      if (code === 0) {
        let message =
          "✅ Download completed! The audio has been saved in the *yt-dlp/* folder.";
        if (videoTitle) {
          message += `\n\n🎵 Title: *${videoTitle}*`;
        }

        await bot.editMessageText(message, {
          chat_id: chatId,
          message_id: statusMessage.message_id,
          parse_mode: "Markdown",
        });
      } else {
        await bot.editMessageText(`❌ Download failed with exit code ${code}`, {
          chat_id: chatId,
          message_id: statusMessage.message_id,
          parse_mode: "Markdown",
        });
      }
    });
  },
};
