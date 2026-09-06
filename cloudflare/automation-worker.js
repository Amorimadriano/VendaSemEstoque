export default {
  async scheduled(_controller, env) {
    const response = await fetch(`${env.APP_BASE_URL}/api/admin/automation/discover`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.AUTOMATION_API_SECRET}` },
    });

    if (!response.ok) {
      console.error(`Marketplace discovery failed with status ${response.status}`);
    }
  },
};