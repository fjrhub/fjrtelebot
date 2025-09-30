const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { privat } = require("@/utils/helper");

module.exports = {
  name: "ytm",
  description: "Download audio only from YouTube using yt-dlp",
  async execute(ctx) {
    const chatId = ctx.chat.id;
    if (!privat(chatId)) return;

    const text = ctx.message.text || "";
    const args = text.split(" ");

    if (args.length < 2) {
      return ctx.reply(
        "Please provide a link after the command, for example:\n`/ytm https://youtu.be/abc123`",
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

    const statusMessage = await ctx.reply("Downloading the audio, please wait...");

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

        await ctx.api.editMessageText(
          chatId,
          statusMessage.message_id,
          message,
          { parse_mode: "Markdown" }
        );
      } else {
        await ctx.api.editMessageText(
          chatId,
          statusMessage.message_id,
          `❌ Download failed with exit code ${code}`,
          { parse_mode: "Markdown" }
        );
      }
    });
  },
};
