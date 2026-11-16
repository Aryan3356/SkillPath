import { roles } from "@/lib/roles";

export const pmkvySources = {
  guidelines: "https://www.msde.gov.in/static/uploads/2024/04/PMKVY-4.0-Guidelines.pdf",
  skillIndia: "https://www.skillindiadigital.gov.in/",
  courses: "https://www.skillindiadigital.gov.in/free-online-courses",
} as const;

export const pmkvyProgramMap = {
  "HTML & CSS": { program: "PMKVY 4.0 Short-Term Training (STT)", area: "Web design and development", eligibleFor: "learners building or upgrading role skills" },
  JavaScript: { program: "PMKVY 4.0 Short-Term Training (STT)", area: "Development (coding)", eligibleFor: "learners building or upgrading role skills" },
  React: { program: "PMKVY 4.0 Short-Term Training (STT)", area: "Development (coding)", eligibleFor: "learners building or upgrading role skills" },
  "Next.js": { program: "PMKVY 4.0 Short-Term Training (STT)", area: "Development (coding)", eligibleFor: "learners building or upgrading role skills" },
  "Node.js": { program: "PMKVY 4.0 Short-Term Training (STT)", area: "Development (coding)", eligibleFor: "learners building or upgrading role skills" },
  "REST APIs": { program: "PMKVY 4.0 Short-Term Training (STT)", area: "Development (coding)", eligibleFor: "learners building or upgrading role skills" },
  SQL: { program: "PMKVY 4.0 Short-Term Training (STT)", area: "Data and database skills", eligibleFor: "learners building or upgrading role skills" },
  "Git & GitHub": { program: "PMKVY 4.0 Short-Term Training (STT)", area: "Development (coding)", eligibleFor: "learners building or upgrading role skills" },
  TypeScript: { program: "PMKVY 4.0 Short-Term Training (STT)", area: "Development (coding)", eligibleFor: "learners building or upgrading role skills" },
  "Responsive Design": { program: "PMKVY 4.0 Short-Term Training (STT)", area: "Web design and development", eligibleFor: "learners building or upgrading role skills" },
  Accessibility: { program: "PMKVY 4.0 Short-Term Training (STT)", area: "Web design and development", eligibleFor: "learners building or upgrading role skills" },
  Python: { program: "PMKVY 4.0 Short-Term Training (STT)", area: "Data Science and programming", eligibleFor: "learners building or upgrading role skills" },
  Excel: { program: "PMKVY 4.0 Short-Term Training (STT)", area: "Data analytics", eligibleFor: "learners building or upgrading role skills" },
  "Power BI": { program: "PMKVY 4.0 Short-Term Training (STT)", area: "Data analytics and visualization", eligibleFor: "learners building or upgrading role skills" },
  Statistics: { program: "PMKVY 4.0 Short-Term Training (STT)", area: "Data analytics", eligibleFor: "learners building or upgrading role skills" },
  "Data Cleaning": { program: "PMKVY 4.0 Short-Term Training (STT)", area: "Data analytics", eligibleFor: "learners building or upgrading role skills" },
  "Data Visualization": { program: "PMKVY 4.0 Short-Term Training (STT)", area: "Data analytics and visualization", eligibleFor: "learners building or upgrading role skills" },
  "Data Structures & Algorithms": { program: "PMKVY 4.0 Short-Term Training (STT)", area: "Software development", eligibleFor: "learners building or upgrading role skills" },
  Java: { program: "PMKVY 4.0 Short-Term Training (STT)", area: "Software development", eligibleFor: "learners building or upgrading role skills" },
  "Object-oriented Programming": { program: "PMKVY 4.0 Short-Term Training (STT)", area: "Software development", eligibleFor: "learners building or upgrading role skills" },
  Testing: { program: "PMKVY 4.0 Short-Term Training (STT)", area: "Software testing and quality", eligibleFor: "learners building or upgrading role skills" },
  Figma: { program: "PMKVY 4.0 Short-Term Training (STT)", area: "UI/UX design", eligibleFor: "learners building or upgrading role skills" },
  Wireframing: { program: "PMKVY 4.0 Short-Term Training (STT)", area: "UI/UX design", eligibleFor: "learners building or upgrading role skills" },
  Prototyping: { program: "PMKVY 4.0 Short-Term Training (STT)", area: "UI/UX design", eligibleFor: "learners building or upgrading role skills" },
  "User Research": { program: "PMKVY 4.0 Short-Term Training (STT)", area: "UI/UX design", eligibleFor: "learners building or upgrading role skills" },
  "Visual Design": { program: "PMKVY 4.0 Short-Term Training (STT)", area: "UI/UX design", eligibleFor: "learners building or upgrading role skills" },
} satisfies Record<string, { program: string; area: string; eligibleFor: string }>;

export type PMKVYRecommendation = {
  skill: string;
  occupation: string;
  program: string;
  area: string;
  eligibleFor: string;
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
