#!/bin/bash

# Quick Setup Script for Audio Storage
# This script shows how to set up audio storage for testing and production

echo "🎵 Audio Storage Setup Guide"
echo "=============================="
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "✓ .env.local created"
    echo ""
    echo "⚠️  Please edit .env.local with your credentials"
else
    echo "✓ .env.local already exists"
fi

echo ""
echo "🚀 Available Storage Modes:"
echo ""
echo "1️⃣  LOCAL STORAGE (for testing - FREE)"
echo "   Add to .env.local:"
echo "   AUDIO_STORAGE=local"
echo "   - Audio files saved to: public/audio/"
echo "   - No AWS costs"
echo "   - Perfect for development"
echo ""
echo "2️⃣  S3 STORAGE (for production - paid)"
echo "   Add to .env.local:"
echo "   AUDIO_STORAGE=s3"
echo "   AWS_REGION=us-east-1"
echo "   AWS_ACCESS_KEY_ID=your_key"
echo "   AWS_SECRET_ACCESS_KEY=your_secret"
echo "   AWS_BUCKET_NAME=your_bucket"
echo ""
echo "📊 Cost Comparison:"
echo "   LOCAL: $0 during testing"
echo "   S3: ~$0.003 per course (varies by size)"
echo ""
echo "✅ Start with LOCAL mode for testing, no setup needed!"
