const { isAuthorized, getJakartaTimeParts } = require("@/utils/helper");
const axios = require("axios");

module.exports = {
  name: "sholat",
  description: "Displays today's prayer times in WIB (Jakarta timezone)",

  async execute(ctx) {
    const chatId = ctx.chat.id;
    if (!isAuthorized(chatId)) return;

    try {
      const { weekday, day, month, year, currentTime } = getJakartaTimeParts();

      const response = await axios.get(
        createUrl("myquran", `/v2/sholat/jadwal/1635/${year}/${month}/${day}`),
        { timeout: 8000 }
      );

      if (!response.data?.data?.jadwal) {
        return ctx.reply(
          "⚠️ Schedule data not found or the API is currently unavailable."
        );
      }

      const {
        lokasi: location,
        daerah: region,
        jadwal: schedule,
      } = response.data.data;

      const convertToMinutes = (time) => {
        const [hour, minute] = time.split(":").map(Number);
        return hour * 60 + minute;
      };

      const nowInMinutes = convertToMinutes(currentTime);

      const prayerTimes = [
        { name: "Imsak", time: convertToMinutes(schedule.imsak) },
        { name: "Subuh", time: convertToMinutes(schedule.subuh) },
        { name: "Terbit", time: convertToMinutes(schedule.terbit) },
        { name: "Dhuha", time: convertToMinutes(schedule.dhuha) },
        { name: "Dzuhur", time: convertToMinutes(schedule.dzuhur) },
        { name: "Ashar", time: convertToMinutes(schedule.ashar) },
        { name: "Maghrib", time: convertToMinutes(schedule.maghrib) },
        { name: "Isya", time: convertToMinutes(schedule.isya) },
      ];

      let lastPrayer = null;
      let nextPrayer = null;

      for (let i = 0; i < prayerTimes.length; i++) {
        if (prayerTimes[i].time > nowInMinutes) {
          lastPrayer =
            prayerTimes[i - 1] || prayerTimes[prayerTimes.length - 1];
          nextPrayer = prayerTimes[i];
          break;
        }
      }

      if (!nextPrayer) {
        nextPrayer = {
          name: "Next Imsak",
          time: convertToMinutes(schedule.imsak) + 24 * 60,
        };
      }

      if (!lastPrayer) {
        lastPrayer = prayerTimes[prayerTimes.length - 1];
      }

      const timeSinceLastPrayer = nowInMinutes - lastPrayer.time;
      const timeUntilNextPrayer = nextPrayer.time - nowInMinutes;

      const formatDuration = (minutes) => {
        if (minutes >= 60) {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          return mins === 0 ? `${hours} hour` : `${hours} hour ${mins} minute`;
        }
        return `${minutes} minute`;
      };

      let additionalInfo = "";
      if (timeSinceLastPrayer >= 0) {
        additionalInfo += `🕰️ ${lastPrayer.name} passed ${formatDuration(
          timeSinceLastPrayer
        )} ago.\n`;
      }
      if (timeUntilNextPrayer >= 0) {
        additionalInfo += `⏳ ${nextPrayer.name} in ${formatDuration(
          timeUntilNextPrayer
        )}.`;
      }

      const message = `📅 ${weekday}, ${day}/${month}/${year}
📍 Location: ${location}, ${region}

🌅 Imsak: ${schedule.imsak}
🕌 Subuh: ${schedule.subuh}
🌞 Terbit: ${schedule.terbit}
☀️ Dhuha: ${schedule.dhuha}
🕛 Dzuhur: ${schedule.dzuhur}
🕒 Ashar: ${schedule.ashar}
🌇 Maghrib: ${schedule.maghrib}
🌙 Isya: ${schedule.isya}

⏰ Current time: ${currentTime} WIB

${additionalInfo}`;

      return ctx.reply(message);
    } catch (error) {
      if (error.response && error.response.status !== 200) {
        return ctx.reply("⚠️ Data not found.");
      }
      return ctx.reply(`⚠️ An error occurred: ${error.message}`);
    }
  },
};
