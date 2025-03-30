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

  async getStats() {
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
    return this.calculateStats(data);
  }

  calculateStats(data) {
    const year = new Date().getFullYear();
    const contributions = data.contributions;

    // Filter contributions for the current year
    const yearContributions = contributions.filter(
      (contrib) => new Date(contrib.date).getFullYear() === year
    );
    let totalContributions = 0;
    let maxContribution = 0;

    for (const contrib of yearContributions) {
      const count = contrib.count || contrib.contributionCount || 0;
      totalContributions += count;
      maxContribution = Math.max(maxContribution, count);
    }

    // Find streak (consecutive days with contributions)
    let currentStreak = 0;
    let longestStreak = 0;

    yearContributions.sort((a, b) => new Date(a.date) - new Date(b.date));

    for (const contrib of yearContributions) {
      if ((contrib.count || contrib.contributionCount || 0) > 0) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return {
      totalContributions,
      maxContribution,
      longestStreak
    };
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
        // Handle different property names for contribution level
        let level;
        if (contribution.level !== undefined) {
          level = contribution.level;
        } else if (contribution.contributionLevel === undefined) {
          level = 0;
        } else {
          level = contribution.contributionLevel;
        }
        weeks[week][day] = level;
      }
    }

    return weeks;
  }
  getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const firstWeekStart =
      firstDayOfYear.getDay() <= 4
        ? firstDayOfYear
        : new Date(date.getFullYear(), 0, 1 + (7 - firstDayOfYear.getDay()));
    const pastDaysOfYear = Math.floor((date - firstWeekStart) / 86_400_000);
    return Math.floor(pastDaysOfYear / 7);
  }
}
