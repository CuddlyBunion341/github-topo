export default class Github {
  constructor(username) {
    this.username = username;
  }

  async getContributions() {
    const response = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${this.username}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Error fetching contributions: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();
    const year = new Date().getFullYear();
    return this.parseContributions(data, year);
  }

  parseContributions(data, year) {
    const contributions = data.contributions;
    const weeks = Array.from({ length: 53 }, () =>
      Array.from({ length: 7 }).fill(0)
    );

    for (const contribution of contributions) {
      const date = new Date(contribution.date);
      if (date.getFullYear() === year) {
        const week = this.getWeekNumber(date);
        const day = date.getDay();
        weeks[week][day] = contribution.level;
      }
    }

    return weeks;
  }
  getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86_400_000;
    return Math.floor((pastDaysOfYear + firstDayOfYear.getDay()) / 7);
  }
}
