// Mock data for Audio Story Generator

export interface Narrator {
  id: string;
  name: string;
  avatar: string;
  initials: string;
  description?: string;
}

export interface Script {
  id: string;
  content: string;
  duration: string;
  wordCount: number;
}

export type EpisodeLength = '1 min' | '3 min' | '5 min';

export const EPISODE_LENGTHS: EpisodeLength[] = ['1 min', '3 min', '5 min'];

// Mock narrators (~20) with coral/red backgrounds
export const mockNarrators: Narrator[] = [
  { id: 'narrator-1', name: 'Addison', initials: 'AD', avatar: '' },
  { id: 'narrator-2', name: 'Madison', initials: 'MA', avatar: '' },
  { id: 'narrator-3', name: 'Kahliyah', initials: 'KA', avatar: '' },
  { id: 'narrator-4', name: 'Razan', initials: 'RA', avatar: '' },
  { id: 'narrator-5', name: 'Josh', initials: 'JO', avatar: '' },
  { id: 'narrator-6', name: 'Jake', initials: 'JA', avatar: '' },
  { id: 'narrator-7', name: 'Sarah', initials: 'SA', avatar: '', description: 'Warm and engaging voice' },
  { id: 'narrator-8', name: 'Samiya', initials: 'SM', avatar: '' },
  { id: 'narrator-9', name: 'Salma', initials: 'SL', avatar: '' },
  { id: 'narrator-10', name: 'Matthew', initials: 'MT', avatar: '' },
  { id: 'narrator-11', name: 'Jennifer', initials: 'JE', avatar: '' },
  { id: 'narrator-12', name: 'Sofia', initials: 'SO', avatar: '' },
  { id: 'narrator-13', name: 'Daniel', initials: 'DA', avatar: '' },
  { id: 'narrator-14', name: 'Emma', initials: 'EM', avatar: '' },
  { id: 'narrator-15', name: 'Marcus', initials: 'MR', avatar: '' },
  { id: 'narrator-16', name: 'Bella', initials: 'BE', avatar: '' },
  { id: 'narrator-17', name: 'Zara', initials: 'ZA', avatar: '' },
  { id: 'narrator-18', name: 'Noah', initials: 'NO', avatar: '' },
];

// Sample script content for generated scripts
const sampleScriptContent = `They said I was blessed when I was born strong but I was actually cursed... Yuri's mother gave birth when she was 16. The father, a wealthy heir who loved her, despite the class divide, suddenly stopped answering her calls. He just ghosted her, taking the magical fire that warmed Yuri's childhood.

She didn't know they hired kidnappers to take her away. Yuri's grandfather raised her after that, on their small family farm, with horses and chickens and wide purple skies. She learned how to fight, how to hunt, learned to channel her inner fire into something useful.

The wolf pounced. A feral snarl, a flash of claw. Adrenaline hit like fire. Her body moved. Duck. Pivot. Blade out in a clean, fast arc. The wolf howled, staggered, fell.`;

const sampleScriptContent2 = `The night was darker than usual when Maya stepped off the train. The station was empty, save for a flickering lamp that cast long shadows across the platform. She clutched her bag closer, feeling the weight of the ancient book inside.

"You shouldn't have come alone," a voice echoed from somewhere in the darkness. Maya's heart raced, but she stood her ground. She had traveled too far, sacrificed too much to turn back now.

"I know what you're hiding," she called out into the void. "And I know how to stop it." The shadows seemed to shift, coiling like smoke. Then, slowly, a figure emerged—tall, cloaked, eyes glowing with an unnatural light.`;

const sampleScriptContent3 = `Every morning, Eli woke up to the same routine: coffee, news, and the quiet hum of the city outside his window. But today was different. Today, there was a letter under his door—handwritten, sealed with red wax.

He hadn't received a physical letter in years. Who even sent letters anymore? His name was scrawled across the front in elegant cursive: "For Eli Chen, when the time is right."

His fingers trembled as he broke the seal. Inside was a single page, and as he read the first line, his world tilted on its axis: "Your grandmother left you more than memories. She left you a kingdom."`;

// Generate mock scripts (simulates AI output)
export const generateMockScripts = (prompt: string, length: EpisodeLength): Script[] => {
  // Simulate different content based on length
  const wordCounts = {
    '1 min': 150,
    '3 min': 450,
    '5 min': 750,
  };

  return [
    {
      id: 'script-1',
      content: sampleScriptContent,
      duration: length,
      wordCount: wordCounts[length],
    },
    {
      id: 'script-2',
      content: sampleScriptContent2,
      duration: length,
      wordCount: wordCounts[length],
    },
    {
      id: 'script-3',
      content: sampleScriptContent3,
      duration: length,
      wordCount: wordCounts[length],
    },
  ];
};

// Mock stories for the dropdown (would come from API later)
export interface MockStory {
  id: string;
  title: string;
}

export const mockStories: MockStory[] = [
  { id: 'story-1', title: 'The Shadow Chronicles' },
  { id: 'story-2', title: 'Whispers in the Wind' },
  { id: 'story-3', title: 'Beyond the Horizon' },
  { id: 'story-4', title: 'The Last Kingdom' },
];

// Audio credits mock
export interface AudioCredits {
  available: number;
  label: string;
}

export const mockCredits: AudioCredits = {
  available: 67,
  label: 'AI Audio Credits',
};
