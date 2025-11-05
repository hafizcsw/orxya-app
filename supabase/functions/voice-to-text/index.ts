import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { audio } = await req.json();
    
    if (!audio) {
      throw new Error("No audio data provided");
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    // Convert base64 to blob
    const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    
    // Use ElevenLabs Speech-to-Text
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: "audio/webm" });
    formData.append("audio", blob, "recording.webm");

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("ElevenLabs error:", error);
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Voice to text error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
