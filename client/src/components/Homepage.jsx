import React from "react";
import heroImg from "public/interview.jpg"; // make sure this file exists in src/assets/

export default function Hero() {
  return (
    <header className="bg-gradient-to-br from-[#0b0f1a] to-[#0f1530]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-20">
        {/* Card */}
        <div
          className="rounded-2xl shadow-2xl overflow-hidden 
                        bg-gradient-to-br from-[#11162a] to-[#0e1230] p-6 sm:p-10 md:p-14"
        >
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Left: text */}
            <div>
              <h1
                className="font-extrabold tracking-tight leading-tight
                             text-white text-4xl sm:text-5xl md:text-6xl"
              >
                Code. Compile. <br className="hidden sm:block" /> Collaborate.
              </h1>

              <p className="mt-6 text-[#c6cedd] text-base sm:text-lg leading-relaxed max-w-prose">
                An all-in-one online compiler supporting 50+ languages with
                built-in video conferencing for technical interviews.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  className="px-6 py-3 rounded-xl font-semibold text-white
                             shadow-lg bg-gradient-to-r from-violet-500 to-sky-500
                             hover:brightness-95 transition"
                >
                  Start Coding
                </button>

                <button
                  className="px-6 py-3 rounded-xl font-semibold
                             text-[#dbe4f6] border border-white/20
                             hover:border-sky-400 hover:shadow-[0_0_0_6px_rgba(46,160,255,0.25)]
                             transition"
                >
                  Schedule interview
                </button>
              </div>
            </div>

            {/* Right: image */}
            <div className="relative h-[280px] sm:h-[340px] md:h-[400px] rounded-xl overflow-hidden shadow-2xl">
              <img
                src={heroImg}
                alt="Interview illustration"
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* subtle glow overlay */}
              <div
                className="absolute inset-0 pointer-events-none 
                              bg-[radial-gradient(60%_35%_at_60%_0%,rgba(124,77,255,0.18),transparent_60%)]"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
