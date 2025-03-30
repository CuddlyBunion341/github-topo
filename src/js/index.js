import '../css/global.css';
import '../scss/global.scss';

import Github from './github';
import Three from './three';
import UsernameForm from './components/UsernameForm';

document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.querySelector('#canvas');
  const mainElement = document.querySelector('main');
  
  // Default username
  let username = 'CuddlyBunion341';
  let threeInstance = null;
  
  // Create the username form
  const usernameForm = new UsernameForm(handleUsernameSubmit, username);
  usernameForm.mount(mainElement);
  
  // Initial visualization load
  await loadVisualization(username);
  
  async function loadVisualization(username) {
    const github = new Github(username);
    
    try {
      // Show loading state
      canvas.classList.add('opacity-50');
      
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

      // Remove existing three.js instance if it exists
      if (threeInstance) {
        // Clean up the previous instance
        threeInstance.dispose();
        threeInstance = null;
      }
      
      if (canvas) {
        // Create a new three.js instance
        threeInstance = new Three(canvas, contributions, username, formattedStats);
      }
    } catch (error) {
      console.error('Error loading GitHub data:', error);

      // Fallback to just showing the visualization without stats
      if (canvas) {
        try {
          const contributions = await github.getContributions();
          
          // Remove existing three.js instance if it exists
          if (threeInstance) {
            threeInstance.dispose();
            threeInstance = null;
          }
          
          threeInstance = new Three(canvas, contributions, username);
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          // Show error message to user
          alert('Failed to load GitHub data. Please check the username and try again.');
        }
      }
    } finally {
      // Reset loading state
      canvas.classList.remove('opacity-50');
      usernameForm.hideLoading();
    }
  }
  
  // Handle username form submission
  async function handleUsernameSubmit(newUsername) {
    if (newUsername === username) {
      usernameForm.hideLoading();
      return;
    }
    
    username = newUsername;
    await loadVisualization(username);
  }
});
