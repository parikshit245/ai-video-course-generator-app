# 🎯 Quick Start: Save Audio for Testing (FREE)

## TL;DR - Get Started in 30 Seconds

### Step 1: Open `.env.local` (or create from `.env.example`)

```bash
# Just add this one line:
AUDIO_STORAGE=local
```

### Step 2: Start your app

```bash
npm run dev
```

### Step 3: Generate a course

- Go to http://localhost:3000
- Enter a topic and click "Generate"
- Audio will be saved to `public/audio/` folder locally
- **Zero AWS costs** ✅

---

## 💾 What Happens Behind the Scenes

### Local Storage (Development)

```
User Input
  ↓
Generate TTS Audio
  ↓
Save to: public/audio/slide-01.mp3
  ↓
Frontend plays from: /audio/slide-01.mp3
  ↓
Cost: $0 ✅
```

### S3 Storage (Production)

```
User Input
  ↓
Generate TTS Audio
  ↓
Upload to: AWS S3 bucket
  ↓
Frontend plays from: https://bucket.s3.region.amazonaws.com/...
  ↓
Cost: ~$0.003 per course ⚠️
```

---

## 🔄 Switching Between Storage Modes

### Currently Using LOCAL?

Files are in: `public/audio/`

To see them:

```bash
ls public/audio/
```

### Switch to S3 (Production)

1. **Get AWS Credentials:**
   - Go to AWS Console
   - Create S3 bucket
   - Create IAM user with S3 access

2. **Update `.env.local`:**

   ```
   AUDIO_STORAGE=s3
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   AWS_BUCKET_NAME=your_bucket
   ```

3. **Restart app:**
   ```bash
   npm run dev
   ```

New audio files will automatically go to S3 ✅

### Switch Back to LOCAL

1. **Update `.env.local`:**

   ```
   AUDIO_STORAGE=local
   ```

2. **Restart app** - Done! Back to local storage.

---

## 📊 Cost Breakdown (S3)

| Action                          | Cost               |
| ------------------------------- | ------------------ |
| Generate 1 course (5 slides)    | ~$0.003            |
| Store 1 slide for a month       | ~$0.00001          |
| Download audio                  | Free (same region) |
| **Total for 100 courses/month** | **~$0.30**         |

---

## ✅ Checklist

- [ ] Set `AUDIO_STORAGE=local` in `.env.local`
- [ ] Run `npm run dev`
- [ ] Generate a test course
- [ ] Check `ls public/audio/` for audio files
- [ ] See video with synced audio playing
- [ ] Later: Switch to S3 when ready for production

---

## 🆘 Troubleshooting

**Audio not playing?**

- Check `public/audio/` folder exists
- Verify `AUDIO_STORAGE=local` in `.env.local`
- Restart dev server

**Folder doesn't exist?**

- App auto-creates it on first audio save
- Or create manually: `mkdir -p public/audio`

**S3 upload failing?**

- Verify AWS credentials in `.env.local`
- Check IAM user has S3 permissions
- Ensure bucket name is correct

---

## 🚀 Next Steps When Ready

1. Test thoroughly with **LOCAL** storage (free)
2. Generate sample courses and videos
3. When satisfied, set up **S3** for production
4. Deploy with S3 configured

---

## Key Files

- **Storage Config**: `lib/audioStorage.ts`
- **Documentation**: `AUDIO_STORAGE.md`
- **Environment Template**: `.env.example`
- **Local Audio Directory**: `public/audio/`
- **API Route**: `app/(auth)/api/audio/[slideId]/route.ts`

---

**Ready?** Start with LOCAL storage now, switch to S3 later! 🎉
