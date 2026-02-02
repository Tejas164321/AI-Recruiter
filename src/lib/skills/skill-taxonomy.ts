/**
 * Skill Taxonomy - Standardized Skill Database
 * 
 * Defines canonical skill names with synonyms for matching.
 * Organized by category for better analysis.
 */

export interface SkillDefinition {
    canonical: string;      // Standard skill name
    synonyms: string[];     // Alternative names
    category: SkillCategory;
    relatedSkills?: string[]; // Related skills for context
    level?: 'beginner' | 'intermediate' | 'advanced';
}

export type SkillCategory =
    | 'frontend'
    | 'backend'
    | 'database'
    | 'devops'
    | 'cloud'
    | 'mobile'
    | 'data-science'
    | 'ml-ai'
    | 'security'
    | 'testing'
    | 'soft-skills'
    | 'tools'
    | 'general';

// ============================================
// Skill Database
// ============================================

export const SKILL_DATABASE: SkillDefinition[] = [
    // Frontend Technologies
    { canonical: 'React.js', synonyms: ['React', 'ReactJS', 'React Framework'], category: 'frontend', relatedSkills: ['Next.js', 'Redux', 'JSX'] },
    { canonical: 'Next.js', synonyms: ['NextJS', 'Next', 'Next.js Framework'], category: 'frontend', relatedSkills: ['React.js'] },
    { canonical: 'Vue.js', synonyms: ['Vue', 'VueJS', 'Vue Framework'], category: 'frontend', relatedSkills: ['Nuxt.js'] },
    { canonical: 'Angular', synonyms: ['AngularJS', 'Angular Framework'], category: 'frontend' },
    { canonical: 'TypeScript', synonyms: ['TS'], category: 'frontend', relatedSkills: ['JavaScript'] },
    { canonical: 'JavaScript', synonyms: ['JS', 'ES6', 'ECMAScript'], category: 'frontend' },
    { canonical: 'HTML5', synonyms: ['HTML', 'Hypertext Markup Language'], category: 'frontend' },
    { canonical: 'CSS3', synonyms: ['CSS', 'Cascading Style Sheets'], category: 'frontend' },
    { canonical: 'Tailwind CSS', synonyms: ['Tailwind', 'TailwindCSS'], category: 'frontend' },
    { canonical: 'Bootstrap', synonyms: ['Bootstrap CSS', 'Bootstrap Framework'], category: 'frontend' },
    { canonical: 'Sass', synonyms: ['SCSS', 'Syntactically Awesome Style Sheets'], category: 'frontend' },
    { canonical: 'Redux', synonyms: ['Redux.js', 'React Redux'], category: 'frontend', relatedSkills: ['React.js'] },
    { canonical: 'Webpack', synonyms: ['Webpack.js'], category: 'frontend' },
    { canonical: 'Vite', synonyms: ['Vite.js'], category: 'frontend' },

    // Backend Technologies
    { canonical: 'Node.js', synonyms: ['Node', 'NodeJS'], category: 'backend', relatedSkills: ['Express.js'] },
    { canonical: 'Express.js', synonyms: ['Express', 'ExpressJS'], category: 'backend', relatedSkills: ['Node.js'] },
    { canonical: 'Python', synonyms: ['Py', 'Python3', 'Python Programming'], category: 'backend' },
    { canonical: 'Django', synonyms: ['Django Framework'], category: 'backend', relatedSkills: ['Python'] },
    { canonical: 'Flask', synonyms: ['Flask Framework'], category: 'backend', relatedSkills: ['Python'] },
    { canonical: 'FastAPI', synonyms: ['Fast API'], category: 'backend', relatedSkills: ['Python'] },
    { canonical: 'Java', synonyms: ['Java Programming'], category: 'backend' },
    { canonical: 'Spring Boot', synonyms: ['Spring', 'Spring Framework'], category: 'backend', relatedSkills: ['Java'] },
    { canonical: 'C#', synonyms: ['C Sharp', 'CSharp'], category: 'backend' },
    { canonical: '.NET', synonyms: ['DotNet', 'ASP.NET', 'ASP.NET Core'], category: 'backend', relatedSkills: ['C#'] },
    { canonical: 'Go', synonyms: ['Golang', 'Go Programming'], category: 'backend' },
    { canonical: 'Ruby', synonyms: ['Ruby Programming'], category: 'backend' },
    { canonical: 'Ruby on Rails', synonyms: ['Rails', 'RoR'], category: 'backend', relatedSkills: ['Ruby'] },
    { canonical: 'PHP', synonyms: ['PHP Programming'], category: 'backend' },
    { canonical: 'Laravel', synonyms: ['Laravel Framework'], category: 'backend', relatedSkills: ['PHP'] },

    // Databases
    { canonical: 'PostgreSQL', synonyms: ['Postgres', 'PostgresSQL'], category: 'database' },
    { canonical: 'MySQL', synonyms: ['My SQL'], category: 'database' },
    { canonical: 'MongoDB', synonyms: ['Mongo', 'Mongo DB'], category: 'database' },
    { canonical: 'Redis', synonyms: ['Redis DB'], category: 'database' },
    { canonical: 'SQL', synonyms: ['Structured Query Language'], category: 'database' },
    { canonical: 'NoSQL', synonyms: ['No SQL'], category: 'database' },
    { canonical: 'Firebase', synonyms: ['Firebase DB', 'Firestore'], category: 'database' },
    { canonical: 'Elasticsearch', synonyms: ['Elastic Search', 'ES'], category: 'database' },
    { canonical: 'Oracle Database', synonyms: ['Oracle', 'Oracle DB'], category: 'database' },
    { canonical: 'Microsoft SQL Server', synonyms: ['SQL Server', 'MSSQL', 'MS SQL'], category: 'database' },

    // DevOps & Infrastructure
    { canonical: 'Docker', synonyms: ['Docker Container', 'Docker Engine'], category: 'devops' },
    { canonical: 'Kubernetes', synonyms: ['K8s', 'K8S'], category: 'devops' },
    { canonical: 'Jenkins', synonyms: ['Jenkins CI', 'Jenkins Pipeline'], category: 'devops' },
    { canonical: 'GitHub Actions', synonyms: ['GH Actions', 'GitHub CI/CD'], category: 'devops' },
    { canonical: 'GitLab CI/CD', synonyms: ['GitLab CI', 'GitLab Pipeline'], category: 'devops' },
    { canonical: 'Terraform', synonyms: ['Terraform IaC'], category: 'devops' },
    { canonical: 'Ansible', synonyms: ['Ansible Automation'], category: 'devops' },
    { canonical: 'CI/CD', synonyms: ['Continuous Integration', 'Continuous Deployment'], category: 'devops' },
    { canonical: 'Linux', synonyms: ['Linux OS', 'Unix'], category: 'devops' },
    { canonical: 'Bash', synonyms: ['Bash Scripting', 'Shell Scripting'], category: 'devops' },
    { canonical: 'Nginx', synonyms: ['Nginx Server'], category: 'devops' },
    { canonical: 'Apache', synonyms: ['Apache Server', 'Apache HTTP'], category: 'devops' },

    // Cloud Platforms
    { canonical: 'AWS', synonyms: ['Amazon Web Services'], category: 'cloud' },
    { canonical: 'Azure', synonyms: ['Microsoft Azure', 'Azure Cloud'], category: 'cloud' },
    { canonical: 'Google Cloud', synonyms: ['GCP', 'Google Cloud Platform'], category: 'cloud' },
    { canonical: 'Heroku', synonyms: ['Heroku Cloud'], category: 'cloud' },
    { canonical: 'Vercel', synonyms: ['Vercel Deployment'], category: 'cloud' },
    { canonical: 'Netlify', synonyms: ['Netlify Hosting'], category: 'cloud' },

    // Mobile Development
    { canonical: 'React Native', synonyms: ['React-Native', 'RN'], category: 'mobile', relatedSkills: ['React.js'] },
    { canonical: 'Flutter', synonyms: ['Flutter Framework'], category: 'mobile', relatedSkills: ['Dart'] },
    { canonical: 'Swift', synonyms: ['Swift Programming'], category: 'mobile' },
    { canonical: 'Kotlin', synonyms: ['Kotlin Programming'], category: 'mobile' },
    { canonical: 'iOS Development', synonyms: ['iOS Dev', 'iPhone Development'], category: 'mobile' },
    { canonical: 'Android Development', synonyms: ['Android Dev'], category: 'mobile' },

    // Data Science & ML
    { canonical: 'Machine Learning', synonyms: ['ML'], category: 'ml-ai' },
    { canonical: 'Deep Learning', synonyms: ['DL'], category: 'ml-ai' },
    { canonical: 'TensorFlow', synonyms: ['Tensor Flow'], category: 'ml-ai' },
    { canonical: 'PyTorch', synonyms: ['Py Torch'], category: 'ml-ai' },
    { canonical: 'Scikit-learn', synonyms: ['sklearn', 'Scikit Learn'], category: 'ml-ai' },
    { canonical: 'Pandas', synonyms: ['Pandas Library'], category: 'data-science' },
    { canonical: 'NumPy', synonyms: ['Num Py', 'Numpy'], category: 'data-science' },
    { canonical: 'Data Analysis', synonyms: ['Data Analytics'], category: 'data-science' },
    { canonical: 'Data Visualization', synonyms: ['Data Viz'], category: 'data-science' },
    { canonical: 'Power BI', synonyms: ['PowerBI', 'Microsoft Power BI'], category: 'data-science' },
    { canonical: 'Tableau', synonyms: ['Tableau Software'], category: 'data-science' },

    // Security
    { canonical: 'Cybersecurity', synonyms: ['Cyber Security', 'InfoSec'], category: 'security' },
    { canonical: 'Authentication', synonyms: ['Auth'], category: 'security' },
    { canonical: 'OAuth', synonyms: ['OAuth2', 'OAuth 2.0'], category: 'security' },
    { canonical: 'JWT', synonyms: ['JSON Web Token', 'JWT Token'], category: 'security' },
    { canonical: 'Encryption', synonyms: ['Data Encryption'], category: 'security' },
    { canonical: 'Penetration Testing', synonyms: ['Pen Testing', 'Pentesting'], category: 'security' },

    // Testing
    { canonical: 'Jest', synonyms: ['Jest Testing'], category: 'testing' },
    { canonical: 'Pytest', synonyms: ['Py Test', 'Python Testing'], category: 'testing' },
    { canonical: 'Unit Testing', synonyms: ['Unit Tests'], category: 'testing' },
    { canonical: 'Integration Testing', synonyms: ['Integration Tests'], category: 'testing' },
    { canonical: 'End-to-End Testing', synonyms: ['E2E Testing', 'E2E Tests'], category: 'testing' },
    { canonical: 'Cypress', synonyms: ['Cypress.io'], category: 'testing' },
    { canonical: 'Selenium', synonyms: ['Selenium WebDriver'], category: 'testing' },
    { canonical: 'Test-Driven Development', synonyms: ['TDD'], category: 'testing' },

    // Tools & Methodologies
    { canonical: 'Git', synonyms: ['Git Version Control'], category: 'tools' },
    { canonical: 'GitHub', synonyms: ['Git Hub'], category: 'tools' },
    { canonical: 'GitLab', synonyms: ['Git Lab'], category: 'tools' },
    { canonical: 'Jira', synonyms: ['Jira Software', 'Atlassian Jira'], category: 'tools' },
    { canonical: 'Agile', synonyms: ['Agile Methodology', 'Agile Development'], category: 'tools' },
    { canonical: 'Scrum', synonyms: ['Scrum Framework'], category: 'tools' },
    { canonical: 'REST API', synonyms: ['RESTful API', 'REST', 'RESTful'], category: 'tools' },
    { canonical: 'GraphQL', synonyms: ['Graph QL'], category: 'tools' },
    { canonical: 'WebSockets', synonyms: ['Web Sockets', 'Socket.io'], category: 'tools' },
    { canonical: 'Microservices', synonyms: ['Microservice Architecture'], category: 'tools' },

    // Soft Skills
    { canonical: 'Communication', synonyms: ['Verbal Communication', 'Written Communication'], category: 'soft-skills' },
    { canonical: 'Team Collaboration', synonyms: ['Teamwork', 'Collaboration'], category: 'soft-skills' },
    { canonical: 'Problem Solving', synonyms: ['Problem-Solving', 'Analytical Thinking'], category: 'soft-skills' },
    { canonical: 'Leadership', synonyms: ['Team Leadership', 'Leading Teams'], category: 'soft-skills' },
    { canonical: 'Project Management', synonyms: ['PM', 'Managing Projects'], category: 'soft-skills' },
    { canonical: 'Time Management', synonyms: ['Time Mgmt'], category: 'soft-skills' },
    { canonical: 'Critical Thinking', synonyms: ['Analytical Skills'], category: 'soft-skills' },
    { canonical: 'Adaptability', synonyms: ['Flexibility', 'Adaptable'], category: 'soft-skills' },
    { canonical: 'Mentoring', synonyms: ['Mentorship', 'Coaching'], category: 'soft-skills' },
];

// ============================================
// Utility Functions
// ============================================

/**
 * Get skill definition by canonical name
 */
export function getSkillByName(name: string): SkillDefinition | undefined {
    const normalized = name.toLowerCase();
    return SKILL_DATABASE.find(
        skill =>
            skill.canonical.toLowerCase() === normalized ||
            skill.synonyms.some(syn => syn.toLowerCase() === normalized)
    );
}

/**
 * Get all skills in a category
 */
export function getSkillsByCategory(category: SkillCategory): SkillDefinition[] {
    return SKILL_DATABASE.filter(skill => skill.category === category);
}

/**
 * Get canonical name from any synonym
 */
export function normalizeSkillName(name: string): string {
    const skill = getSkillByName(name);
    return skill ? skill.canonical : name;
}

/**
 * Get all skill names (canonical + synonyms) for matching
 */
export function getAllSkillVariants(): string[] {
    const variants: string[] = [];
    for (const skill of SKILL_DATABASE) {
        variants.push(skill.canonical);
        variants.push(...skill.synonyms);
    }
    return variants;
}

/**
 * Search skills by partial match
 */
export function searchSkills(query: string): SkillDefinition[] {
    const normalized = query.toLowerCase();
    return SKILL_DATABASE.filter(skill =>
        skill.canonical.toLowerCase().includes(normalized) ||
        skill.synonyms.some(syn => syn.toLowerCase().includes(normalized))
    );
}
