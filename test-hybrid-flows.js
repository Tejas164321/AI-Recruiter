/**
 * Quick Test Script - Hybrid Flows
 * 
 * Use this to quickly test each hybrid flow independently
 */

import { performBulkScreening } from './src/ai/flows/rank-candidates-hybrid';
import { calculateAtsScore } from './src/ai/flows/calculate-ats-score-hybrid';
import { extractJobRoles } from './src/ai/flows/extract-job-roles-hybrid';
import { generateJDInterviewQuestions } from './src/ai/flows/generate-jd-interview-questions-hybrid';

// ============================================
// Test Data Helpers
// ============================================

/**
 * Create a sample resume data URI
 */
function createSampleResumeDataUri(): string {
    const sampleResume = `
JOHN DOE
Software Engineer
Email: john.doe@example.com | Phone: (555) 123-4567

EXPERIENCE
Senior Software Engineer | Tech Corp (2020 - Present)
- Led development of React-based web applications
- Implemented Node.js microservices architecture
- Managed team of 5 developers
- Technologies: React, TypeScript, Node.js, PostgreSQL

EDUCATION
B.S. Computer Science | University of Tech (2016 - 2020)

SKILLS
Frontend: React.js, TypeScript, JavaScript, HTML, CSS
Backend: Node.js, Express, Python, Django
Databases: PostgreSQL, MongoDB, Redis
DevOps: Docker, Kubernetes, AWS, CI/CD
  `.trim();

    return `data:text/plain;charset=utf-8;base64,${Buffer.from(sampleResume).toString('base64')}`;
}

/**
 * Create a sample job description data URI
 */
function createSampleJDDataUri(): string {
    const sampleJD = `
Senior Full-Stack Developer

We are seeking an experienced Senior Full-Stack Developer to join our team.

Requirements:
- 5+ years experience with React.js and TypeScript
- Strong backend experience with Node.js
- Database design with PostgreSQL
- Experience with cloud platforms (AWS preferred)
- Team leadership experience
- Excellent communication skills

Responsibilities:
- Design and develop scalable web applications
- Lead technical architecture decisions
- Mentor junior developers
- Collaborate with product team on feature planning
  `.trim();

    return `data:text/plain;charset=utf-8;base64,${Buffer.from(sampleJD).toString('base64')}`;
}

// ============================================
// Test Functions
// ============================================

async function testResumeRanking() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 1: Resume Ranking');
    console.log('='.repeat(60));

    const input = {
        jobRolesToScreen: [{
            id: 'test-jd-1',
            name: 'Senior Full-Stack Developer',
            contentDataUri: createSampleJDDataUri(),
        }],
        resumesToRank: [
            {
                id: 'test-resume-1',
                name: 'John Doe Resume.pdf',
                dataUri: createSampleResumeDataUri(),
            },
        ],
    };

    const startTime = Date.now();
    const results = await performBulkScreening(input);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ Test completed in ${elapsed}s`);
    console.log('\nResults:');
    for (const result of results) {
        console.log(`\nJob: ${result.jobDescriptionName}`);
        for (const candidate of result.candidates) {
            console.log(`  - ${candidate.name}: ${candidate.score}/100`);
            console.log(`    Skills: ${candidate.keySkills}`);
            console.log(`    ATS: ${candidate.atsScore}/100`);
        }
    }
}

async function testATSScoring() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: ATS Scoring');
    console.log('='.repeat(60));

    const result = await calculateAtsScore({
        resumeDataUri: createSampleResumeDataUri(),
        originalResumeName: 'John Doe Resume.pdf',
    });

    console.log(`\n✅ ATS Score: ${result.atsScore}/100`);
    console.log(`Candidate: ${result.candidateName || 'Unknown'}`);
    console.log(`\nFeedback:\n${result.atsFeedback}`);
}

async function testJobRoleExtraction() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: Job Role Extraction');
    console.log('='.repeat(60));

    const input = {
        jobDescriptionDocuments: [{
            name: 'Senior Developer JD.pdf',
            dataUri: createSampleJDDataUri(),
        }],
    };

    const results = await extractJobRoles(input);

    console.log(`\n✅ Extracted ${results.length} role(s):`);
    for (const role of results) {
        console.log(`  - ${role.name} (from ${role.originalDocumentName})`);
    }
}

async function testInterviewQuestions() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 4: Interview Questions');
    console.log('='.repeat(60));

    const result = await generateJDInterviewQuestions({
        jobDescriptionDataUri: createSampleJDDataUri(),
        roleTitle: 'Senior Full-Stack Developer',
    });

    console.log('\n✅ Generated Questions:\n');
    console.log('Technical:', result.technicalQuestions.length, 'questions');
    result.technicalQuestions.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));

    console.log('\nBehavioral:', result.behavioralQuestions.length, 'questions');
    result.behavioralQuestions.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
}

// ============================================
// Run All Tests
// ============================================

async function runAllTests() {
    console.log('\n🚀 TESTING ALL HYBRID FLOWS\n');

    try {
        await testResumeRanking();
        await testATSScoring();
        await testJobRoleExtraction();
        await testInterviewQuestions();

        console.log('\n' + '='.repeat(60));
        console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY');
        console.log('='.repeat(60) + '\n');
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error);
    }
}

// ============================================
// Run Individual Test
// ============================================

const testName = process.argv[2];

if (!testName) {
    console.log('Usage: node test-hybrid-flows.js [test-name]');
    console.log('\nAvailable tests:');
    console.log('  ranking      - Test resume ranking pipeline');
    console.log('  ats          - Test ATS scoring');
    console.log('  extraction   - Test job role extraction');
    console.log('  questions    - Test interview question generation');
    console.log('  all          - Run all tests');
    process.exit(0);
}

switch (testName.toLowerCase()) {
    case 'ranking':
        testResumeRanking();
        break;
    case 'ats':
        testATSScoring();
        break;
    case 'extraction':
        testJobRoleExtraction();
        break;
    case 'questions':
        testInterviewQuestions();
        break;
    case 'all':
        runAllTests();
        break;
    default:
        console.error(`Unknown test: ${testName}`);
        process.exit(1);
}
