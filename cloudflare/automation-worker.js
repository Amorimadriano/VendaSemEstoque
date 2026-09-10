export default {
  async scheduled(_controller, env) {
    const endpoints = [
      'autonomous-workflow',
      'affiliate-conversions',
    ];
    for (const endpoint of endpoints) {
      const response = await fetch(`${env.APP_BASE_URL}/api/admin/automation/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.AUTOMATION_API_SECRET}` },
      });
      if (!response.ok) {
        console.error(`Automation ${endpoint} failed with status ${response.status}`);
      }
    }
  },
};