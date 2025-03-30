import '../css/global.css';
import '../scss/global.scss';

import UsernameForm from './components/UsernameForm';
import Github from './github';
import Three from './three';

document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.querySelector('#canvas');
  const mainElement = document.querySelector('main');

  let username = 'CuddlyBunion341';
  let threeInstance = null;

  const usernameForm = new UsernameForm(handleUsernameSubmit, username);
  usernameForm.mount(mainElement);

  await loadVisualization(username);

  async function loadVisualization(username) {
    const github = new Github(username);

    try {
      canvas.classList.add('opacity-50');

      const [contributions, stats] = await Promise.all([
        github.getContributions(),
        github.getStats()
      ]);

      const formattedStats = {
        ...stats,
        totalContributions: stats.totalContributions.toLocaleString(),
        maxContribution: stats.maxContribution.toLocaleString(),
        longestStreak: stats.longestStreak.toLocaleString()
      };

      console.log('GitHub Stats:', formattedStats);

      if (threeInstance) {
        threeInstance.dispose();
        threeInstance = null;
      }

      if (canvas) {
        threeInstance = new Three(
          canvas,
          contributions,
          username,
          formattedStats
        );
      }
    } catch (error) {
      console.error('Error loading GitHub data:', error);

      if (canvas) {
        try {
          const contributions = await github.getContributions();

          if (threeInstance) {
            threeInstance.dispose();
            threeInstance = null;
          }

          threeInstance = new Three(canvas, contributions, username);
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          alert(
            'Failed to load GitHub data. Please check the username and try again.'
          );
        }
      }
    } finally {
      canvas.classList.remove('opacity-50');
      usernameForm.hideLoading();
    }
  }

  async function handleUsernameSubmit(newUsername) {
    if (newUsername === username) {
      usernameForm.hideLoading();
      return;
    }

    username = newUsername;
    await loadVisualization(username);
  }
});
