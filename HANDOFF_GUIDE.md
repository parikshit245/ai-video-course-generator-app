# 👋 Project Handoff Guide - Audio Storage Toggle

This guide is for the next developer taking over the project. Here's everything you need to know about the audio storage toggle.

---

## 🎯 Quick Toggle (30 seconds)

### File to Edit:

```
.env.local
```

### To Use LOCAL Storage (Testing - FREE ✅)

```env
AUDIO_STORAGE=local
```

- Audio saved to: `public/audio/` folder
- Cost: $0
- Speed: Instant
- Restart: `npm run dev`

### To Use S3 Storage (Production - Paid ⚠️)

```env
AUDIO_STORAGE=s3
AWS_REGION=your_aws_region
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_BUCKET_NAME=your_bucket_name
```

⚠️ **Use `.env.local` for actual credentials (never commit secrets to git!)**

- Audio uploaded to: AWS S3
- Cost: ~$0.003 per course
- Speed: CDN-backed
- Restart: `npm run dev`

---

## 📁 Where Files Are:

| File                   | Purpose                                 |
| ---------------------- | --------------------------------------- |
| `.env.local`           | **← EDIT THIS** to toggle storage mode  |
| `.env.example`         | Template for all env variables          |
| `lib/audioStorage.ts`  | Storage logic (handles both modes)      |
| `public/audio/`        | Local audio files (if using LOCAL mode) |
| `AUDIO_STORAGE.md`     | Full documentation                      |
| `QUICK_START_AUDIO.md` | Detailed guide                          |

---

## 🔄 How to Switch

**Step 1:** Open `.env.local`

```bash
# Edit this single line:
AUDIO_STORAGE=local   # or "s3"
```

**Step 2:** Restart dev server

```bash
npm run dev
```

**Done!** New audio files use the new storage automatically ✨

---

## 💡 What's Already Set Up

Your predecessor already configured AWS credentials:

- ✅ AWS_BUCKET_NAME: `ai-generator-audio-storage`
- ✅ AWS_REGION: `ap-south-1`
- ✅ AWS_ACCESS_KEY_ID: (already in `.env`)
- ✅ AWS_SECRET_ACCESS_KEY: (already in `.env`)

So S3 storage is **ready to use immediately** if you set `AUDIO_STORAGE=s3`

---

## 📊 Cost Comparison

| Scenario               | Storage | Cost         |
| ---------------------- | ------- | ------------ |
| Testing 10 courses     | LOCAL   | $0 ✅        |
| Production 100 courses | S3      | ~$0.30/month |

**Recommendation:**

- Use `LOCAL` while developing/testing
- Switch to `S3` for production

---

## 🐛 Troubleshooting

**Audio not playing after switching?**

1. Make sure you restarted `npm run dev`
2. Check console for storage mode confirmation
3. For LOCAL: verify `public/audio/` exists
4. For S3: verify AWS credentials are correct

**Console shows storage mode?**
The app logs on startup:

```
🎵 Audio Storage Mode: LOCAL
📁 Audio files will be saved to: public/audio/
```

---

## 🚀 Typical Workflow

1. **Start Development:**

   ```env
   AUDIO_STORAGE=local
   ```

   Test freely, $0 cost

2. **Before Production:**

   ```env
   AUDIO_STORAGE=s3
   ```

   Enable AWS S3 for real users

3. **Going Back to Testing:**
   ```env
   AUDIO_STORAGE=local
   ```
   Switch anytime

---

## 📞 Files to Reference

- **Environment config**: `.env.example`
- **Storage implementation**: `lib/audioStorage.ts`
- **Full docs**: `AUDIO_STORAGE.md`
- **Quick start**: `QUICK_START_AUDIO.md`

---

## ✅ Checklist Before Handing Off

- [ ] `.env.local` created with `AUDIO_STORAGE=local`
- [ ] Run `npm run dev` and verify app starts
- [ ] Generate a test course
- [ ] Check `public/audio/` for audio files
- [ ] Play video to confirm audio works
- [ ] Document any credentials passed to next person
- [ ] Read this file carefully

---

## 🎓 Key Concept

The beauty of this setup: **No code changes needed, just change one line in `.env.local`**

The storage logic automatically uses whatever storage mode you configured. It's completely transparent to the rest of the app.

---

**Questions?** Check `AUDIO_STORAGE.md` or `QUICK_START_AUDIO.md` for detailed info.

**Ready to go!** 🚀
