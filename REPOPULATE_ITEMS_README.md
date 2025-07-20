# Items Data Repopulation Script

This script clears and repopulates the Firebase `items_data` collection with filtered data from Zoho Inventory.

## What it does

1. **Clears** all existing records in the `items_data` collection
2. **Fetches** all products from Zoho Inventory
3. **Filters out** items that meet any of these criteria:
   - Status is 'inactive'
   - Price is £0.00
   - SKU begins with 'XXX'
4. **Normalizes brand names** using the following mapping:
   - Räder → rader
   - Blomus → blomus
   - Remember → remember
   - Relaxound → relaxound
   - My Flame Lifestyle → my-flame-lifestyle
   - GEFU → gefu
   - Elvang → elvang
5. **Adds Firebase Storage image URLs** for each product:
   - Main image: `{sku}_1.webp`
   - Thumbnail: `{sku}_1_400x400.webp`

## How to run

From the server directory:

```bash
cd /Users/alastairblair/Desktop/Splitfin/SplitWeb/server
node repopulate-items.js
```

Or run directly:

```bash
node src/scripts/repopulateItemsData.js
```

## Important Notes

⚠️ **WARNING**: This script will DELETE ALL existing records in `items_data` before repopulating!

### Image URLs

The script generates signed URLs for images stored in Firebase Storage. The URLs have a long expiry date (2030) to avoid frequent regeneration. Images are expected to be stored in the following structure:

```
gs://splitfin-609c9.firebasestorage.app/brand-images/{brand_normalized}/{sku}_1.webp
gs://splitfin-609c9.firebasestorage.app/brand-images/{brand_normalized}/{sku}_1_400x400.webp
```

### Rate Limiting

The script uses the existing rate limiting from `zohoInventoryService.js` to avoid hitting Zoho API limits.

### Batch Processing

- Firestore writes are batched in groups of 400 documents
- There's a 1-second delay between batches to avoid overloading

### Error Handling

- Individual product errors won't stop the entire process
- Errors are logged and counted in the final summary
- Sync metadata is stored in `sync_metadata/items_repopulation`

## Output

The script provides detailed progress updates and a final summary showing:
- Total items cleared
- Total items fetched from Zoho
- Items added to Firebase
- Items filtered out (with breakdown by reason)
- Any errors encountered

## Monitoring

Check the sync status in Firebase:
- Collection: `sync_metadata`
- Document: `items_repopulation`

This document contains:
- `lastRun`: Timestamp of last execution
- `stats`: Detailed statistics from the run
- `status`: 'completed' or 'failed'
- `error`: Error message if failed

## Troubleshooting

### Firebase Initialization Error

If you get an error like "The default Firebase app does not exist", check:

1. **Service Account Key**: Ensure `serviceAccountKey.json` exists in the server directory:
   ```bash
   ls /Users/alastairblair/Desktop/Splitfin/SplitWeb/server/serviceAccountKey.json
   ```

2. **Test Setup**: Run the test script to verify Firebase configuration:
   ```bash
   cd /Users/alastairblair/Desktop/Splitfin/SplitWeb/server
   node test-repopulate-setup.js
   ```

3. **Environment Variables**: For production, set `FIREBASE_SERVICE_ACCOUNT_JSON` with the entire JSON content of your service account key.

### Storage Bucket Issues

If images aren't being found or URLs aren't working:

1. Verify the storage bucket name in your Firebase console
2. Check that images exist in the expected paths:
   ```
   brand-images/{brand_normalized}/{sku}_1.webp
   brand-images/{brand_normalized}/{sku}_1_400x400.webp
   ```
3. Ensure the service account has Storage Admin permissions