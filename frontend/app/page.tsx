'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Video, Zap, Download, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-8 h-8 text-emerald-500" />
              <span className="text-2xl font-bold text-white">MemeClips</span>
            </div>
            <Link href="/create">
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 blur-3xl"></div>

          <div className="relative max-w-7xl mx-auto text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight">
              Create Viral Meme Videos
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">
                In Minutes
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-slate-300 mb-10 max-w-3xl mx-auto">
              Overlay your favorite memes on trending background videos. No editing skills required.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/create">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8 py-6 h-auto">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Creating
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-slate-600 text-white hover:bg-slate-800 text-lg px-8 py-6 h-auto">
                Watch Examples
              </Button>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-16">
              How It Works
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-8 hover:border-emerald-500 transition-all">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-6">
                  <div className="text-3xl font-bold text-emerald-500">1</div>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Upload Your Memes</h3>
                <p className="text-slate-400">
                  Add one or two meme images that will appear on your video. Use your own or pick from trending memes.
                </p>
              </div>

              <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-8 hover:border-emerald-500 transition-all">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-6">
                  <div className="text-3xl font-bold text-emerald-500">2</div>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Choose Background</h3>
                <p className="text-slate-400">
                  Select from our collection of trending backgrounds or upload your own custom video.
                </p>
              </div>

              <div className="bg-slate-900/50 backdrop-blur border border-slate-700 rounded-xl p-8 hover:border-emerald-500 transition-all">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-6">
                  <div className="text-3xl font-bold text-emerald-500">3</div>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Generate & Share</h3>
                <p className="text-slate-400">
                  Preview your creation, make adjustments, and download your viral-ready meme video.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-16">
              Why MemeClips?
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Lightning Fast</h3>
                <p className="text-slate-400 text-sm">Create videos in under 2 minutes</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Download className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Easy Export</h3>
                <p className="text-slate-400 text-sm">Download in high quality instantly</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Watermarks</h3>
                <p className="text-slate-400 text-sm">Clean exports ready to share</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Easy to Use</h3>
                <p className="text-slate-400 text-sm">No video editing experience needed</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-emerald-600 to-blue-600">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready to Go Viral?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join thousands creating engaging meme videos every day
            </p>
            <Link href="/create">
              <Button size="lg" className="bg-white text-emerald-600 hover:bg-slate-100 text-lg px-8 py-6 h-auto">
                Create Your First Video
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-700 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-slate-400">
          <p>&copy; 2025 MemeClips. Create viral content effortlessly.</p>
        </div>
      </footer>
    </div>
  );
}
