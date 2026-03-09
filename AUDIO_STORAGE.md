# Audio Storage Configuration

This project supports two audio storage modes:

## 1. **Local Storage (Development/Testing)** ⚡

- **Cost**: FREE
- **Speed**: Instant
- **Setup**: Zero configuration needed
- **Files stored in**: `public/audio/` directory
- **Use case**: Testing, development, demos

### How to use:

```bash
# Set environment variable (or leave unset, defaults to local)
AUDIO_STORAGE=local
```

**Pros:**

- No AWS costs
- No internet dependency
- Files served instantly
- Perfect for testing

**Cons:**

- Not suitable for production
- Files stored locally (won't scale across servers)
- Need to manage file cleanup

---

## 2. **AWS S3 Storage (Production)** ☁️

- **Cost**: Per-request and storage fees (~$0.003 per 10,000 requests)
- **Speed**: CDN-backed, globally distributed
- **Setup**: Requires AWS account
- **Files stored in**: AWS S3 bucket
- **Use case**: Production, high traffic, scaling

### How to use:

```bash
# Set environment variable
AUDIO_STORAGE=s3

# Required AWS credentials in .env.local:
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_BUCKET_NAME=your_bucket_name
```

**Pros:**

- Reliable, scalable storage
- Works across multiple servers
- CDN-backed for fast delivery
- Professional grade

**Cons:**

- Costs money
- Requires AWS setup
- Internet dependent

---

## How to Switch Between Modes

### From Local to S3 (One-time setup):

1. **Create AWS S3 Bucket:**

   ```bash
   # Go to AWS S3 console and create a bucket
   # Configure bucket for public read access
   # Create IAM user with S3 access
   ```

2. **Update `.env.local:`**

   ```
   AUDIO_STORAGE=s3
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   AWS_BUCKET_NAME=your-bucket
   ```

3. **Restart your app** - New audio will be saved to S3

### From S3 back to Local:

1. **Update `.env.local`:**

   ```
   AUDIO_STORAGE=local
   ```

2. **Restart your app** - New audio will be saved locally

---

## Cost Estimation (S3)

For a typical AI course generator:

**Per Course Generation:**

- TTS Generation: ~$0.003 (dependent on chapter count)
- Storage: ~$0.0001 per month per slide
- Data Transfer: Free (same region)

**Example**:

- 100 courses with 5 chapters each (25 chapters total)
- First month: ~$0.30 (TTS) + minimal storage overhead
- Subsequent months: ~$0.001 storage cost

---

## File Structure

```
public/
  audio/           ← Local audio files (only in LOCAL mode)
    slide-001.mp3
    slide-002.mp3
    ...
```

**Important**: Ignore this directory in production!

```gitignore
public/audio/*
!public/audio/.gitkeep
```

---

## Best Practice Workflow

1. **Development**: Use `AUDIO_STORAGE=local` (free, instant testing)
2. **Testing**: Switch to S3, generate a few test courses
3. **Production**: Keep `AUDIO_STORAGE=s3` for all users

---

## Troubleshooting

**Local storage not working:**

- Check `public/audio/` directory exists and is writable
- Verify `AUDIO_STORAGE=local` in `.env.local`

**S3 upload failing:**

- Verify AWS credentials are correct
- Check bucket name and region
- Ensure IAM user has S3 permissions
- Check bucket CORS settings if needed

**Audio not playing:**

- For local: Ensure file exists in `public/audio/`
- For S3: Check bucket public access settings
- Verify storage type matches your configuration
