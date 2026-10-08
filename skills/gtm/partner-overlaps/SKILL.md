---
name: partner-overlaps
description: Partner overlaps in Salesforce. Use after a partner account mapping session to load its list, or to answer which partners map to an account.
---

# Partner overlaps

Org: `--target-org liam@bold.security`. This is production.

## Data model

Every account + partner pair has exactly one `Partner_Overlap__c` record, and every write is an **upsert** on `Unique_Key__c`. A pair missing from a newer list keeps its record as-is; its `Mapped_Date__c` shows the age.

| Field | Meaning |
|---|---|
| `Account__c` | Master-detail to the prospect/customer Account |
| `Partner__c` | The partner Account (Type `Partner` or `Reseller`) |
| `Relationship_Type__c` | `Customer` (partner sells there), `Prospect` (partner pursuing it), or blank. On update, set it only when the list gives a value. |
| `Partner_Contact__c` | Labelled "Partner Rep": a Contact on the partner Account, with `Contact.Partner_Role__c` = Sales Rep / Partner Manager / Sales Engineer / Leadership |
| `Mapped_Date__c` | Session date |
| `Notes__c` | Append-only log. Read the existing value, then add the new note below it as `[YYYY-MM-DD] <note>`. |
| `Unique_Key__c` | `<AccountId18>-<PartnerId18>`, unique external Id. Upsert matching uses the key you send, so build it from both 18-char Ids; a before-save flow writes the same value on every save. |

The partner Account's `Last_Mapping_Date__c` holds the latest session date.

## Steps

1. **Pin the run inputs.** Fix with the user: the partner Account (one Id, Type Partner/Reseller), the session date, and the unmatched mode: `skip` (default), `create`, or `icp`. For `create`/`icp`, also fix the new accounts' Type and owner, and for `icp` the criteria. Done when every input is fixed.

2. **Match every row.** Match each list row to an Account by domain (`Domain__c`, then `Website`), then exact name, then fuzzy name. Bucket it `matched` (one Account), `ambiguous` (several candidates, or fuzzy only), or `unmatched`. Done when every row sits in exactly one bucket.

3. **Resolve reps and existing records.** Match any named partner reps to Contacts on the partner Account by email, then name; mark the rest `new contact`. Label each matched row `insert` or `update` against this partner's existing overlaps. Done when every matched row has a rep status and a label.

4. **Preview.** Show the user: counts per bucket, each `ambiguous` row with its candidates, the `unmatched` rows and what the mode does to them, `new contact` rows, and a sample of inserts and updates. Done when the user approves and every `ambiguous` row has their answer.

5. **Write.** Create approved new Accounts, then `new contact` Contacts under the partner Account with `Partner_Role__c`, then upsert the overlaps (`sf data upsert bulk` for large lists, composite REST for small), then set the partner's `Last_Mapping_Date__c`. Done when every approved row has a write result.

6. **Reconcile.** Re-query this partner's overlaps and report against the preview: inserted, updated, skipped, failed with reason. Done when every approved row is accounted for.

## Lookup: which partners map to an account

```sql
SELECT Partner__r.Name, Relationship_Type__c, Partner_Contact__r.Name, Partner_Contact__r.Email, Mapped_Date__c, Notes__c
FROM Partner_Overlap__c WHERE Account__r.Name = '<account>' ORDER BY Mapped_Date__c DESC
```
