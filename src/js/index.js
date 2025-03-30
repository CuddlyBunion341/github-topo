import '../css/global.css';
import '../scss/global.scss';

import Github from './github';
import Three from './three';

document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.querySelector('#canvas');
  const username = 'CuddlyBunion341';
  const github = new Github(username);
  
  try {
    // Get contributions data and stats in parallel
    const [contributions, stats] = await Promise.all([
      github.getContributions(),
      github.getStats()
    ]);
    
    // Format the statistics for display
    const formattedStats = {
      ...stats,
      totalContributions: stats.totalContributions.toLocaleString(),
      maxContribution: stats.maxContribution.toLocaleString(),
      longestStreak: stats.longestStreak.toLocaleString()
    };
    
    console.log('GitHub Stats:', formattedStats);
    
    if (canvas) {
      new Three(canvas, contributions, username, formattedStats);
    }
  } catch (error) {
    console.error('Error loading GitHub data:', error);
    
    // Fallback to just showing the visualization without stats
    if (canvas) {
      const contributions = await github.getContributions();
      new Three(canvas, contributions, username);
    }
  }
});
