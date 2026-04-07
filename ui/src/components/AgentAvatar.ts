export function buildSpriteMap(agents: any[]): Map<string, number> {
  const map = new Map<string, number>();
  agents.forEach((agent, index) => {
    // 14 different sprites in metrocity pack (numbered 1.png to 14.png)
    map.set(agent.id, (index % 14) + 1);
  });
  return map;
}

export function getSubAgentSpriteNum(id: string): number {
  return (id.charCodeAt(0) % 14) + 1;
}
