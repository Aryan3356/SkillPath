export type Skill = { name: string; level: "Core" | "Good to know"; category: string };
export type Role = { title: string; short: string; description: string; skills: Skill[] };

export const roles: Role[] = [
  { title: "Full-stack Developer", short: "Full-stack", description: "Build and connect complete web applications.", skills: [
    { name: "HTML & CSS", level: "Core", category: "Web" }, { name: "JavaScript", level: "Core", category: "Web" }, { name: "React", level: "Core", category: "Frontend" }, { name: "Next.js", level: "Core", category: "Frontend" }, { name: "Node.js", level: "Core", category: "Backend" }, { name: "REST APIs", level: "Core", category: "Backend" }, { name: "SQL", level: "Good to know", category: "Database" }, { name: "Git & GitHub", level: "Core", category: "Tools" }, { name: "TypeScript", level: "Good to know", category: "Web" }
  ] },
  { title: "Frontend Developer", short: "Frontend", description: "Create accessible, responsive web experiences.", skills: [
    { name: "HTML & CSS", level: "Core", category: "Web" }, { name: "JavaScript", level: "Core", category: "Web" }, { name: "React", level: "Core", category: "Frontend" }, { name: "TypeScript", level: "Core", category: "Web" }, { name: "Responsive Design", level: "Core", category: "Design" }, { name: "Accessibility", level: "Good to know", category: "Design" }, { name: "Git & GitHub", level: "Core", category: "Tools" }, { name: "REST APIs", level: "Good to know", category: "Backend" }
  ] },
  { title: "Data Analyst", short: "Data analyst", description: "Turn data into useful, clear decisions.", skills: [
    { name: "SQL", level: "Core", category: "Data" }, { name: "Python", level: "Core", category: "Programming" }, { name: "Excel", level: "Core", category: "Tools" }, { name: "Power BI", level: "Core", category: "Visualization" }, { name: "Statistics", level: "Core", category: "Data" }, { name: "Data Cleaning", level: "Core", category: "Data" }, { name: "Data Visualization", level: "Good to know", category: "Visualization" }
  ] },
  { title: "Software Engineer", short: "Software engineer", description: "Design, build, and maintain reliable software.", skills: [
    { name: "Data Structures & Algorithms", level: "Core", category: "Computer science" }, { name: "Java", level: "Core", category: "Programming" }, { name: "Python", level: "Good to know", category: "Programming" }, { name: "SQL", level: "Core", category: "Database" }, { name: "Git & GitHub", level: "Core", category: "Tools" }, { name: "Object-oriented Programming", level: "Core", category: "Computer science" }, { name: "Testing", level: "Good to know", category: "Quality" }
  ] },
  { title: "UI/UX Designer", short: "UI/UX designer", description: "Make digital products easier and nicer to use.", skills: [
    { name: "Figma", level: "Core", category: "Design" }, { name: "Wireframing", level: "Core", category: "Design" }, { name: "Prototyping", level: "Core", category: "Design" }, { name: "User Research", level: "Core", category: "Research" }, { name: "Visual Design", level: "Core", category: "Design" }, { name: "Accessibility", level: "Good to know", category: "Design" }
  ] }
];

export const skillAliases: Record<string, string[]> = {
  "HTML & CSS": ["html", "css", "html5", "css3"], "JavaScript": ["javascript", "js", "ecmascript"], "React": ["react", "react.js", "reactjs"], "Next.js": ["next.js", "nextjs"], "Node.js": ["node.js", "nodejs", "express.js", "expressjs"], "REST APIs": ["rest api", "restful api", "rest apis", "api development"], "SQL": ["sql", "mysql", "postgresql", "postgres", "sqlite"], "Git & GitHub": ["git", "github", "gitlab"], "TypeScript": ["typescript", "ts"], "Responsive Design": ["responsive design", "mobile-first", "mobile first"], "Accessibility": ["accessibility", "wcag", "aria"], "Python": ["python", "pandas", "numpy"], "Excel": ["excel", "spreadsheets", "ms excel"], "Power BI": ["power bi", "powerbi"], "Statistics": ["statistics", "statistical analysis"], "Data Cleaning": ["data cleaning", "data cleansing", "data wrangling"], "Data Visualization": ["data visualization", "data visualisation", "tableau", "matplotlib", "seaborn"], "Data Structures & Algorithms": ["data structures", "algorithms", "dsa", "leetcode"], "Java": ["java", "core java"], "Object-oriented Programming": ["object-oriented", "object oriented", "oop"], "Testing": ["testing", "unit testing", "jest", "pytest"], "Figma": ["figma"], "Wireframing": ["wireframing", "wireframes"], "Prototyping": ["prototyping", "prototype"], "User Research": ["user research", "usability testing", "user interviews"], "Visual Design": ["visual design", "graphic design", "typography"]
};

export function findSkills(text: string) {
  const normalized = text.toLowerCase();
  return Object.entries(skillAliases).filter(([, aliases]) => aliases.some((alias) => new RegExp(`(^|[^a-z0-9+#.])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9+#.]|$)`, "i").test(normalized))).map(([name]) => name);
}
