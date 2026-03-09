# ⚡ Audio Storage Toggle - ONE MINUTE GUIDE

## The File to Edit:

```
.env.local
```

## For Testing (FREE):

```env
AUDIO_STORAGE=local
```

## For Production (PAID):

```env
AUDIO_STORAGE=s3
AWS_REGION=your_aws_region
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_BUCKET_NAME=your_bucket_name
```

⚠️ **Get actual credentials from `.env.local` (never commit secrets!)**

## After Editing:

```bash
npm run dev
```

## That's It! 🎉

Audio will automatically save to your chosen storage:

- `local` → `public/audio/` folder ($0)
- `s3` → AWS S3 bucket (~$0.003/course)

Need help? Read `HANDOFF_GUIDE.md`
