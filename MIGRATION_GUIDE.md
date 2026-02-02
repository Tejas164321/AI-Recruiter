# Migration Guide: Switching to Hybrid Architecture

This guide explains how to switch your AI-Recruiter system from the old Genkit/Gemini flows to the new hybrid local LLM architecture.

## Overview

You now have **parallel implementations** of all core flows:

| Feature | Old (Cloud) | New (Hybrid) | Status |
|---------|------------|--------------|---------|
| Resume Ranking | `rank-candidates.ts` | `rank-candidates-hybrid.ts` | ✅ Ready |
| ATS Scoring | `calculate-ats-score.ts` | `calculate-ats-score-hybrid.ts` | ✅ Ready |
| Job Role Extraction | `extract-job-roles.ts` | `extract-job-roles-hybrid.ts` | ✅ Ready |
| Interview Questions | `generate-jd-interview-questions.ts` | `generate-jd-interview-questions-hybrid.ts` | ✅ Ready |

---

## Migration Approach

### Option A: Gradual Migration (Recommended for Production)

Test each hybrid flow individually before full migration.

#### Step 1: Test Resume Ranking

1. Find where `performBulkScreening` is imported:
   ```bash
   grep -r "from '@/ai/flows/rank-candidates'" src/
   ```

2. Create a parallel import to test:
   ```typescript
   // Old
   import { performBulkScreening } from '@/ai/flows/rank-candidates';
   
   // New (for testing)
   import { performBulkScreening as performBulkScreeningHybrid } from '@/ai/flows/rank-candidates-hybrid';
   ```

3. Test with a small dataset (1 JD + 5 resumes)

4. Compare results and performance

#### Step 2: Replace Old Imports

Once testing is successful, replace the import:

```typescript
// Before
import { performBulkScreening } from '@/ai/flows/rank-candidates';

// After
import { performBulkScreening } from '@/ai/flows/rank-candidates-hybrid';
```

#### Step 3: Repeat for Other Flows

Follow the same pattern for:
- `calculateAtsScore` → `calculate-ats-score-hybrid`
- `extractJobRoles` → `extract-job-roles-hybrid`
- `generateJDInterviewQuestions` → `generate-jd-interview-questions-hybrid`

---

### Option B: Quick Replacement (Fastest, Higher Risk)

Replace the old files directly with the new implementation.

1. **Backup old files:**
   ```bash
   mkdir src/ai/flows/old-genkit
   mv src/ai/flows/rank-candidates.ts src/ai/flows/old-genkit/
   mv src/ai/flows/calculate-ats-score.ts src/ai/flows/old-genkit/
   mv src/ai/flows/extract-job-roles.ts src/ai/flows/old-genkit/
   mv src/ai/flows/generate-jd-interview-questions.ts src/ai/flows/old-genkit/
   ```

2. **Rename hybrid files to replace old ones:**
   ```bash
   mv src/ai/flows/rank-candidates-hybrid.ts src/ai/flows/rank-candidates.ts
   mv src/ai/flows/calculate-ats-score-hybrid.ts src/ai/flows/calculate-ats-score.ts
   mv src/ai/flows/extract-job-roles-hybrid.ts src/ai/flows/extract-job-roles.ts
   mv src/ai/flows/generate-jd-interview-questions-hybrid.ts src/ai/flows/generate-jd-interview-questions.ts
   ```

3. **Test the entire application**

---

## Files to Update

### 1. Server Actions / API Routes

Look for imports in these locations:

```
src/app/api/*/route.ts
src/app/*/actions.ts
src/components/**/*.tsx (if using server actions directly)
```

### Common Import Locations

#### Resume Ranker Page
```typescript
// src/app/resume-ranker/actions.ts or page.tsx
import { performBulkScreening } from '@/ai/flows/rank-candidates-hybrid';
```

#### ATS Score Finder
```typescript
// src/app/ats-score-finder/actions.ts or page.tsx
import { calculateAtsScore } from '@/ai/flows/calculate-ats-score-hybrid';
```

#### Dashboard / Job Upload
```typescript
// src/app/dashboard/actions.ts or page.tsx
import { extractJobRoles } from '@/ai/flows/extract-job-roles-hybrid';
```

#### Interview Prep
```typescript
// src/app/interview-question-generator/actions.ts or page.tsx
import { generateJDInterviewQuestions } from '@/ai/flows/generate-jd-interview-questions-hybrid';
```

---

## Package.json Cleanup

After migration is complete, remove Genkit dependencies:

```bash
npm uninstall genkit @genkit-ai/google-genai @genkit-ai/next
```

Remove these scripts from `package.json`:
```json
{
  "scripts": {
    "genkit:dev": "...",  // Remove
    "genkit:watch": "..."  // Remove
  }
}
```

---

## Environment Variables

### Remove (No Longer Needed)
```bash
GOOGLE_API_KEY=...
```

### Keep (Already Added)
```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_PRIMARY_MODEL=qwen2.5:7b-instruct
OLLAMA_FALLBACK_MODEL=qwen2.5:7b-instruct
```

---

## Testing Checklist

Before going to production, test each flow:

### ✅ Resume Ranking
- [ ] Upload 1 JD + 10 resumes
- [ ] Check all resumes are ranked
- [ ] Verify scores are reasonable (50-90 for good matches, 0-40 for poor)
- [ ] Verify skill matching is accurate
- [ ] Check LLM feedback is coherent
- [ ] Measure processing time (should be 2-4s per resume)

### ✅ ATS Scoring
- [ ] Upload a well-formatted resume
- [ ] Check ATS score is high (70-90)
- [ ] Verify feedback mentions strengths
- [ ] Upload a poorly-formatted resume
- [ ] Check ATS score is low (30-50)
- [ ] Verify feedback suggests improvements

### ✅ Job Role Extraction
- [ ] Upload single-role JD
- [ ] Verify 1 role extracted with correct title
- [ ] Upload multi-role JD (if you have one)
- [ ] Verify multiple roles extracted

### ✅ Interview Questions
- [ ] Generate questions for a tech role
- [ ] Verify all 4 categories have 3-5 questions
- [ ] Check questions are relevant to the role
- [ ] Verify no generic questions

---

## Performance Expectations

Based on your hardware (RTX 3050 4GB, 16GB RAM):

| Operation | Expected Time |
|-----------|--------------|
| Document parsing | < 500ms |
| Embedding generation | < 500ms |
| Skill extraction | < 100ms |
| ATS analysis | < 200ms |
| LLM inference | 1.5-3s |
| **Total per resume** | **2-4 seconds** |
| **20 resumes batch** | **40-80 seconds** |

If processing is slower:
1. Check Ollama is running: `ollama list`
2. Monitor GPU usage: Task Manager → Performance → GPU
3. Reduce batch size if memory issues occur

---

## Troubleshooting

### Issue: "Ollama connection refused"
**Solution:**
```bash
# Start Ollama server
ollama serve
```

### Issue: "Model not found"
**Solution:**
```bash
# Pull the model again
ollama pull qwen2.5:7b-instruct
```

### Issue: "Out of memory" errors
**Solution:**
- The system automatically falls back to 7B model
- Reduce concurrent processing (already set to 1)
- Close other GPU-intensive applications

### Issue: LLM returns malformed JSON
**Solution:**
- The system has fallback logic - continues without LLM feedback
- Check Ollama logs for details
- Try regenerating

### Issue: Processing too slow
**Solution:**
- Check if embedding model is being re-downloaded
- Verify Ollama is using GPU (check nvidia-smi)
- Consider using lighter embedding model

---

## Rollback Plan

If you need to rollback to the old system:

1. **Restore old files from backup:**
   ```bash
   mv src/ai/flows/old-genkit/* src/ai/flows/
   ```

2. **Reinstall Genkit:**
   ```bash
   npm install genkit @genkit-ai/google-genai @genkit-ai/next
   ```

3. **Restore GOOGLE_API_KEY in `.env.local`**

4. **Restart development server**

---

## After Migration

Once hybrid flows are working:

1. **Delete old Genkit files:**
   ```bash
   rm -rf src/ai/flows/old-genkit
   rm src/ai/genkit.ts
   rm src/ai/dev.ts
   ```

2. **Remove Genkit from package.json**

3. **Update documentation** to reference new architecture

4. **Update README.md** with Ollama setup instructions

---

## Success Criteria

Migration is successful when:

✅ All resumes are ranked correctly  
✅ Processing time is 2-4s per resume  
✅ No cloud API calls are made  
✅ No rate limit errors occur  
✅ Scores are consistent and explainable  
✅ LLM feedback is relevant  
✅ System works offline (after initial setup)

---

## Support

If you encounter issues:

1. Check console logs for detailed error messages
2. Verify Ollama is running: `http://localhost:11434/api/tags`
3. Test individual components (document parser, embeddings, etc.)
4. Review the implementation plan for architecture details

---

## Next Steps

After successful migration:

1. Consider hosting on a more powerful machine for faster processing
2. Add more skills to the taxonomy
3. Fine-tune scoring weights for your specific needs
4. Implement additional features (resume anonymization, etc.)
5. Build dashboard analytics for hiring metrics
