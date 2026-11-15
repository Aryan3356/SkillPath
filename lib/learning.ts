import { roles } from "@/lib/roles";

export type LearningStep = { title: string; done: boolean };
export type LearningResource = { label: string; url: string };
export type LearningItem = {
  title: string;
  duration: string;
  description: string;
  objective: string;
  project: string;
  steps: LearningStep[];
  resources: LearningResource[];
  done: boolean;
};

const resources: Record<string, LearningResource> = {
  "HTML & CSS": { label: "MDN HTML and CSS guides", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core" },
  JavaScript: { label: "MDN JavaScript guide", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" },
  React: { label: "React: Learn", url: "https://react.dev/learn" },
  "Next.js": { label: "Next.js Learn", url: "https://nextjs.org/learn" },
  "Node.js": { label: "Node.js Learn", url: "https://nodejs.org/en/learn" },
  "REST APIs": { label: "MDN: HTTP and APIs", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP" },
  SQL: { label: "PostgreSQL Tutorial", url: "https://www.postgresql.org/docs/current/tutorial.html" },
  "Git & GitHub": { label: "GitHub Docs: Git", url: "https://docs.github.com/en/get-started/using-git" },
  TypeScript: { label: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/handbook/intro.html" },
  "Responsive Design": { label: "MDN: Responsive design", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design" },
  Accessibility: { label: "W3C Web Accessibility Initiative", url: "https://www.w3.org/WAI/fundamentals/accessibility-intro/" },
  Python: { label: "Python Tutorial", url: "https://docs.python.org/3/tutorial/" },
  Excel: { label: "Microsoft Excel help", url: "https://support.microsoft.com/excel" },
  "Power BI": { label: "Microsoft Learn: Power BI", url: "https://learn.microsoft.com/power-bi/fundamentals/" },
  Statistics: { label: "Khan Academy: Statistics", url: "https://www.khanacademy.org/math/statistics-probability" },
  "Data Cleaning": { label: "pandas: Getting started", url: "https://pandas.pydata.org/docs/getting_started/index.html" },
  "Data Visualization": { label: "Matplotlib Tutorials", url: "https://matplotlib.org/stable/tutorials/index.html" },
  "Data Structures & Algorithms": { label: "OpenDSA learning materials", url: "https://opendsa-server.cs.vt.edu/ODSA/Books/Everything/html/" },
  Java: { label: "Dev.java Learn Java", url: "https://dev.java/learn/" },
  "Object-oriented Programming": { label: "Oracle Java tutorials", url: "https://docs.oracle.com/javase/tutorial/java/concepts/" },
  Testing: { label: "Jest: Getting started", url: "https://jestjs.io/docs/getting-started" },
  Figma: { label: "Figma Help Center", url: "https://help.figma.com/hc/en-us/categories/360002051613" },
  Wireframing: { label: "Figma Help Center", url: "https://help.figma.com/hc/en-us/categories/360002051613" },
  Prototyping: { label: "Figma Help Center", url: "https://help.figma.com/hc/en-us/categories/360002051613" },
  "User Research": { label: "Nielsen Norman Group: UX research", url: "https://www.nngroup.com/articles/which-ux-research-methods/" },
  "Visual Design": { label: "Material Design foundations", url: "https://m3.material.io/foundations" },
};

const projects: Record<string, string> = {
  "HTML & CSS": "Create a responsive one-page portfolio for a project you have built.",
  JavaScript: "Add a searchable, filterable list to a small project.",
  React: "Build a reusable form with validation and a clear success state.",
  "Next.js": "Turn a small React project into a multi-page app with one API route.",
  "Node.js": "Create a small API that validates and stores a list of items.",
  "REST APIs": "Build and document two related endpoints, including error responses.",
  SQL: "Design a small database for a student club and write useful queries for it.",
  "Git & GitHub": "Create a repository with meaningful commits, a README, and one pull request.",
  TypeScript: "Add types and input checks to a feature in a project you already know.",
  "Responsive Design": "Make one existing page work well on a phone, tablet, and desktop.",
  Accessibility: "Improve keyboard navigation, labels, and contrast on one existing page.",
  Python: "Write a small script that reads a file, transforms its data, and reports errors.",
  Excel: "Build a tidy spreadsheet with formulas, filters, and a clear summary chart.",
  "Power BI": "Create a one-page dashboard from a small public dataset.",
  Statistics: "Use a small dataset to explain its distribution and one limitation.",
  "Data Cleaning": "Clean a public CSV and document the changes you made.",
  "Data Visualization": "Create two charts that answer different questions about one dataset.",
  "Data Structures & Algorithms": "Solve and explain five problems using arrays, maps, and sorting.",
  Java: "Create a small command-line app with a few well-tested classes.",
  "Object-oriented Programming": "Model a small library or inventory system using classes and tests.",
  Testing: "Add unit tests for a feature, including one invalid-input case.",
  Figma: "Design a small mobile flow and share a clickable prototype.",
  Wireframing: "Sketch three screens for one task and test the flow with a classmate.",
  Prototyping: "Connect a short user flow and revise it after one usability check.",
  "User Research": "Write five neutral interview questions and summarize three practice interviews.",
  "Visual Design": "Create a consistent type, spacing, and colour system for a three-screen app.",
};

export function getLearningGuide(skill: string) {
  const roleSkill = roles.flatMap((role) => role.skills).find((item) => item.name === skill);
  const project = projects[skill] || `Use ${skill} to complete a small feature in a project you already understand.`;
  return {
    why: roleSkill ? `${skill} is listed under ${roleSkill.category} for the roles in this guide. The match is a prompt to check your experience, not a proficiency score.` : `This skill was not detected by the resume keyword scan. It may be described differently in your resume.`,
    objective: `Be able to explain the main ideas in ${skill}, use them in a small task, and describe your decisions.`,
    project,
    resource: resources[skill] || { label: "MDN Web Docs", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development" },
  };
}

export function buildLearningPlan(skills: string[]): LearningItem[] {
  return skills.slice(0, 4).map((skill, index) => {
    const guide = getLearningGuide(skill);
    return {
      title: skill,
      duration: ["1 week", "2 weeks", "2 weeks", "3 weeks"][index],
      description: guide.project,
      objective: guide.objective,
      project: guide.project,
      steps: [
        { title: `Read the basics of ${skill}`, done: false },
        { title: "Follow one example and recreate it yourself", done: false },
        { title: guide.project, done: false },
        { title: "Write down what you learned and add the project to your portfolio", done: false },
      ],
      resources: [guide.resource],
      done: false,
    };
  });
}
