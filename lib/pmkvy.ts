import { roles } from "@/lib/roles";

export const pmkvySources = {
  guidelines: "https://www.msde.gov.in/static/uploads/2024/04/PMKVY-4.0-Guidelines.pdf",
  skillIndia: "https://www.skillindiadigital.gov.in/",
  courses: "https://www.skillindiadigital.gov.in/free-online-courses",
} as const;

export const pmkvyProgramMap = {
  "HTML & CSS": { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "Web design and development", audience: "learners building or upgrading role skills" },
  JavaScript: { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "Development (coding)", audience: "learners building or upgrading role skills" },
  React: { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "Development (coding)", audience: "learners building or upgrading role skills" },
  "Next.js": { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "Development (coding)", audience: "learners building or upgrading role skills" },
  "Node.js": { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "Development (coding)", audience: "learners building or upgrading role skills" },
  "REST APIs": { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "Development (coding)", audience: "learners building or upgrading role skills" },
  SQL: { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "Data and database skills", audience: "learners building or upgrading role skills" },
  "Git & GitHub": { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "Development (coding)", audience: "learners building or upgrading role skills" },
  TypeScript: { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "Development (coding)", audience: "learners building or upgrading role skills" },
  "Responsive Design": { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "Web design and development", audience: "learners building or upgrading role skills" },
  Accessibility: { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "Web design and development", audience: "learners building or upgrading role skills" },
  Python: { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "Data Science and programming", audience: "learners building or upgrading role skills" },
  Excel: { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "Data analytics", audience: "learners building or upgrading role skills" },
  "Power BI": { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "Data analytics and visualization", audience: "learners building or upgrading role skills" },
  Statistics: { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "Data analytics", audience: "learners building or upgrading role skills" },
  "Data Cleaning": { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "Data analytics", audience: "learners building or upgrading role skills" },
  "Data Visualization": { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "Data analytics and visualization", audience: "learners building or upgrading role skills" },
  "Data Structures & Algorithms": { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "Software development", audience: "learners building or upgrading role skills" },
  Java: { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "Software development", audience: "learners building or upgrading role skills" },
  "Object-oriented Programming": { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "Software development", audience: "learners building or upgrading role skills" },
  Testing: { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "Software testing and quality", audience: "learners building or upgrading role skills" },
  Figma: { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "UI/UX design", audience: "learners building or upgrading role skills" },
  Wireframing: { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "UI/UX design", audience: "learners building or upgrading role skills" },
  Prototyping: { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "UI/UX design", audience: "learners building or upgrading role skills" },
  "User Research": { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "UI/UX design", audience: "learners building or upgrading role skills" },
  "Visual Design": { route: "PMKVY 4.0 Short-Term Training (STT)", searchArea: "UI/UX design", audience: "learners building or upgrading role skills" },
} satisfies Record<string, { route: string; searchArea: string; audience: string }>;

export type PMKVYRecommendation = {
  skill: string;
  occupation: string;
  route: string;
  searchArea: string;
  audience: string;
};

export function getPMKVYRecommendations(occupation: string, missingSkills: string[]): PMKVYRecommendation[] {
  const supportedOccupation = roles.find((role) => role.title === occupation);
  if (!supportedOccupation) return [];
  const roleSkills = new Set(supportedOccupation.skills.map((skill) => skill.name));
  return [...new Set(missingSkills)]
    .filter((skill) => roleSkills.has(skill) && skill in pmkvyProgramMap)
    .map((skill) => ({ skill, occupation, ...pmkvyProgramMap[skill as keyof typeof pmkvyProgramMap] }));
}

export const pmkvyProgramNotes = {
  shortTermTraining: "PMKVY 4.0 guidelines describe STT as NSQF-aligned courses, generally 300–600 hours, delivered through accredited and affiliated training centres.",
  recognitionPriorLearning: "RPL is for candidates with prior learning or experience in the job role who meet that role’s assessment criteria.",
  specialProjects: "Special Projects address specified groups, geographies, or specialized skilling needs; availability depends on approval and eligibility.",
  verifiedOn: "2026-11-16",
};
