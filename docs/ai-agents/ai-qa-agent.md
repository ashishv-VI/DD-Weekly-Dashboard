# AI QA Agent

**Phase:** 4 | **Runs:** Nightly at 4:30 AM | **Output:** System Health Score

---

## Responsibilities

| Task | Description |
|------|-------------|
| API Testing | Validate GA4 + GSC API responses are returning data |
| UI Testing | Check that key dashboard routes return 200 OK |
| Mobile Testing | Validate mobile responsiveness (Lighthouse CI) |
| Export Testing | Verify PDF + CSV exports generate successfully |
| Authentication Testing | Verify login flow and token refresh works |
| Security Validation | Check for exposed endpoints, auth failures |

---

## Output

- **System Health Score** (0–100) stored in health_scores table
- Summary of issues found, written to `insights` table
- Any critical failures trigger an immediate alert

---

## Checks

### API Health Checks
```
✓ GA4 API responds within 2 seconds
✓ GSC API responds within 2 seconds
✓ Last sync was within 26 hours
✓ No sync job failed in last 24 hours
✓ Queue depth is under 100 jobs
```

### Data Accuracy Checks
```
✓ Today's GA4 clicks match yesterday's cached value ± 1%
✓ No zero-value records on days that should have data
✓ AI traffic totals are consistent with GA4 source data
✓ No duplicate records in keywords table for same date
```

### Platform Health Checks
```
✓ Dashboard API endpoints respond < 500ms
✓ Authentication endpoints functional
✓ Report generation completed successfully
✓ Alert delivery jobs completed
```

---

## Health Score Calculation

| Check Category | Weight | Pass = Points |
|---------------|--------|--------------|
| Sync jobs | 30% | 30 points if all syncs succeeded |
| API response times | 20% | 20 points if all APIs < 500ms |
| Data accuracy | 25% | 25 points if no anomalies |
| Export functionality | 15% | 15 points if exports work |
| Security checks | 10% | 10 points if no issues |

---

## Open Questions / Gaps

- [ ] Does the QA agent do real end-to-end testing or only API checks?
- [ ] How are mobile tests automated? Playwright? Lighthouse CI?
- [ ] What constitutes a "security validation" pass?
- [ ] Who is notified when QA agent finds critical failures?
- [ ] Is QA agent output visible to clients or internal only?
