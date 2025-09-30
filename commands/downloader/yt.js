const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { privat } = require("@/utils/helper");

module.exports = {
  name: "yt",
  description: "Download video/audio using yt-dlp based on source",
  async execute(ctx) {
    const chatId = ctx.chat.id;
    if (!privat(chatId)) return;

    const text = ctx.message.text || "";
    const args = text.split(" ");

    if (args.length < 2) {
      return ctx.reply(
        "Please provide a link after the command, for example:\n`/yt https://youtu.be/abc123`",
        { parse_mode: "Markdown" }
      );
    }

    const url = args[1];
    const outputFolder = path.join(__dirname, "../../yt-dlp");

    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    const isYouTube = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(url);
    const isShorts = /(youtube\.com\/shorts\/)/.test(url);

    let format;
    if (isYouTube) {
      format = isShorts
        ? "bestaudio[ext=webm]+bestvideo[height<=1920][ext=webm]"
        : "bestaudio[ext=webm]+bestvideo[height<=720][ext=webm]";
    } else {
      format = "best";
    }

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

    const statusMessage = await ctx.reply("Downloading the video, please wait...");

    let videoTitle = null;

    const ytProcess = spawn("yt-dlp", cmdArgs);

    ytProcess.stdout.on("data", (data) => {
      const output = data.toString();
      console.log(output);

      const match = output.match(
        /Destination:\s*(.+\/)?(.+)\.(webm|mp4|mkv|mp3|m4a)/i
      );
      if (match && !videoTitle) {
        videoTitle = match[2]
          .replace(/\.f\d{2,4}$/, "") // remove .f251, .f140, etc
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
          "✅ Download completed! The file has been saved in the *yt-dlp/* folder.";
        if (videoTitle) {
          message += `\n\n🎬 Title: *${videoTitle}*`;
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
