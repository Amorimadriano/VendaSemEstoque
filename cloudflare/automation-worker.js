export default {
  async scheduled(_controller, env) {
    const endpoints = [
      'amazon-discover',
      'autonomous-workflow',
      'publish-instagram',
      'publish-facebook',
      'publish-instagram-stories',
      'publish-facebook-stories',
      'affiliate-conversions',
      'weekly-campaigns',
    ];
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${env.APP_BASE_URL}/api/admin/automation/${endpoint}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.AUTOMATION_API_SECRET}` },
        });
        if (!response.ok) {
          console.error(`Automation ${endpoint} failed with status ${response.status}`);
        } else {
          console.log(`Automation ${endpoint} executed successfully`);
        }
      } catch (error) {
        console.error(`Automation ${endpoint} error:`, error);
      }
    }
  },
};