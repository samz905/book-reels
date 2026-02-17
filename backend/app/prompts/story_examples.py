"""
Few-shot examples for story generation.

Each example is a (user_prompt, model_response) pair converted from
ai-video/script_examples.pdf into the exact JSON output format.

IMPORTANT: action is a JSON ARRAY of fragment strings (one per micro-action).
Dialogue is a single string with \\n between exchanges.
Do NOT compress action into a single paragraph string.

3 examples across genres: romance/drama, corporate revenge, fantasy.
"""

import json

# ── Example 1: THE BLACKOUT (Romance / Drama) ─────────────────────────
_EXAMPLE_1_INPUT = (
    'Turn this idea into a 1-minute vertical episode with exactly 8 scenes:\n\n'
    'IDEA: "Two people trapped together during a blackout — forced proximity reveals '
    'cracks in a marriage neither chose."\n'
    'STYLE: Cinematic (photorealistic, shot on 35mm film)'
)

_EXAMPLE_1_OUTPUT = json.dumps({
    "ingredients": {
        "protagonist": "Kate, a woman cornered in a house that isn't hers",
        "conflict_source": "Ryan, whose ownership of everything — including her — is the wound",
        "immediate_tension": "They collide in total darkness, inches apart, neither backing down",
        "secret": "Kate never planned to stay — and something medical changes everything",
        "spike_moment": "Kate reveals both were traded like property",
        "cliff_problem": "A medical envelope with her name falls — OBSTETRICS"
    },
    "characters": [
        {
            "id": "kate",
            "name": "Kate",
            "gender": "female",
            "age": "late 20s",
            "appearance": "Sharp collarbones under a thin camisole, dark hair loose past shoulders, bare feet on cold tile, silver band on left hand she keeps twisting",
            "role": "protagonist"
        },
        {
            "id": "ryan",
            "name": "Ryan",
            "gender": "male",
            "age": "early 30s",
            "appearance": "Rolled sleeves on a wrinkled dress shirt, strong jaw set tight, watch glinting in candlelight, tired circles under sharp eyes",
            "role": "antagonist"
        }
    ],
    "locations": [
        {
            "id": "loc_1",
            "name": "Kitchen",
            "description": "Dark modern kitchen, granite countertops, a single drawer pulled open, candle wax pooling on the island, city blackout visible through floor-to-ceiling windows",
            "atmosphere": "Claustrophobic intimacy, warm candlelight against cold surfaces"
        }
    ],
    "scenes": [
        {
            "scene_number": 1,
            "title": "The Collision",
            "duration": "7 seconds",
            "characters_on_screen": ["kate", "ryan"],
            "setting_id": "loc_1",
            "action": ["BLACKOUT.", "Total darkness.", "They collide hard in the kitchen doorway.", "They freeze inches apart. Breathing.", "Neither moves away."],
            "dialogue": "KATE: Oh my God\u2014\nRYAN: I've got it\u2014\nKATE: Don't touch me.",
            "image_prompt": "Pitch black frame. Two silhouettes collide in a doorway, faces inches apart. Faint city glow through window outlines their frozen bodies. Her hand pressed flat against his chest pushing back. His arms raised defensively.",
            "regenerate_notes": "Exact body positions can vary, darkness level adjustable",
            "scene_heading": "INT. KITCHEN - NIGHT",
            "scene_change": False
        },
        {
            "scene_number": 2,
            "title": "Claimed Territory",
            "duration": "8 seconds",
            "characters_on_screen": ["kate", "ryan"],
            "setting_id": "loc_1",
            "action": ["They both reach blindly.", "Their hands hit the same drawer.", "She yanks the drawer open.", "Silence. Sharp."],
            "dialogue": "RYAN: Still memorizing my house?\nKATE: Your house?\nRYAN: Six days and you've claimed territory.\nKATE: Six days longer than I planned to stay.",
            "image_prompt": "Two hands on the same kitchen drawer in near-darkness. Her fingers grip the handle, his cover hers. Granite countertop reflects faint window light. Both faces in profile, jaw muscles tight.",
            "regenerate_notes": "Drawer contents and exact hand overlap can vary",
            "scene_heading": "INT. KITCHEN - NIGHT",
            "scene_change": False
        },
        {
            "scene_number": 3,
            "title": "The Block",
            "duration": "8 seconds",
            "characters_on_screen": ["kate", "ryan"],
            "setting_id": "loc_1",
            "action": ["He steps closer.", "Blocking her path.", "Beat.", "He stiffens."],
            "dialogue": "RYAN: You think I asked for this marriage?\nKATE: No.\nKATE: You just didn't fight it.\nRYAN: Careful.\nKATE: Or what?",
            "image_prompt": "He blocks her path in the narrow kitchen. Close two-shot from the side. His body angled toward her, shoulders wide. She tilts her chin up. Candle flicker catches the silver band on her finger. Less than a foot between them.",
            "regenerate_notes": "Exact blocking positions and candle placement can vary",
            "scene_heading": "INT. KITCHEN - NIGHT",
            "scene_change": False
        },
        {
            "scene_number": 4,
            "title": "The Trade",
            "duration": "8 seconds",
            "characters_on_screen": ["kate", "ryan"],
            "setting_id": "loc_1",
            "action": ["The lighter sparks.", "Light floods her face.", "It lands.", "He stares at her.", "Wounded. Furious.", "Silence detonates between them."],
            "dialogue": "KATE: You were traded for a yacht.\nRYAN: You think you weren't?",
            "image_prompt": "Lighter flame illuminates her face in tight close-up. Warm light carves shadows across her cheekbones. His face half-lit behind her \u2014 eyes wide, jaw dropped. The flame trembles between them. Everything else pitch black.",
            "regenerate_notes": "Flame size and shadow angles can vary",
            "scene_heading": "INT. KITCHEN - NIGHT",
            "scene_change": False
        },
        {
            "scene_number": 5,
            "title": "Synced Breathing",
            "duration": "7 seconds",
            "characters_on_screen": ["kate", "ryan"],
            "setting_id": "loc_1",
            "action": ["Neither moves.", "The candle flickers between them.", "Their breathing syncs unintentionally.", "But he doesn't step away."],
            "dialogue": "KATE: This was never supposed to be real.\nRYAN: It isn't.",
            "image_prompt": "Candle between two still figures on the granite island. Warm glow on both faces. Her eyes glassy, his jaw locked. Breathing visible in the cold air. Window behind shows black city skyline. Stillness weighs on the frame.",
            "regenerate_notes": "Candle position and ambient light level can vary",
            "scene_heading": "INT. KITCHEN - NIGHT",
            "scene_change": False
        },
        {
            "scene_number": 6,
            "title": "The Grab",
            "duration": "7 seconds",
            "characters_on_screen": ["kate", "ryan"],
            "setting_id": "loc_1",
            "action": ["Her hand shakes.", "The candle tips. Rolls.", "He grabs it. Stops it.", "His hand closes over hers.", "Electric.", "Neither planned it.", "Neither lets go."],
            "dialogue": None,
            "image_prompt": "Overhead shot of two hands on a tilted candle on granite. His fingers wrapped over hers. Wax pooling. Both faces looking down at their joined hands. Warm light from below casting upward shadows on stunned expressions.",
            "regenerate_notes": "Wax pattern and exact hand overlap can vary",
            "scene_heading": "INT. KITCHEN - NIGHT",
            "scene_change": False
        },
        {
            "scene_number": 7,
            "title": "The Kiss",
            "duration": "8 seconds",
            "characters_on_screen": ["kate", "ryan"],
            "setting_id": "loc_1",
            "action": ["They don't separate.", "She pulls him forward.", "They kiss.", "Immediate. Violent. Inevitable.", "Then\u2014", "She shoves him back."],
            "dialogue": "KATE: This is a mistake.\nRYAN: Yes.\nKATE: No.",
            "image_prompt": "She grips his shirt collar, pulls him in. Their lips meet in candlelight. His hands hover at her waist. Then her palms slam his chest \u2014 shoving him backward. Her face twisted between want and rage. His arms spread catching himself on the counter.",
            "regenerate_notes": "Exact kiss framing and shove intensity can vary",
            "scene_heading": "INT. KITCHEN - NIGHT",
            "scene_change": False
        },
        {
            "scene_number": 8,
            "title": "The Envelope",
            "duration": "7 seconds",
            "characters_on_screen": ["kate", "ryan"],
            "setting_id": "loc_1",
            "action": ["She backs away. Breathing hard.", "Something hits the floor.", "He looks down.", "The candlelight reveals\u2014", "A medical envelope.", "Her name.", "OBSTETRICS.", "He looks up.", "She freezes.", "Hard cut to black."],
            "dialogue": "RYAN: Kate\u2026",
            "image_prompt": "Low angle on kitchen floor. A white medical envelope face-up on dark tile. Her name visible. 'OBSTETRICS' printed below. Candlelight catches the text. His shoes at one edge of frame, her bare feet backing away at the other. His hand reaching down.",
            "regenerate_notes": "Envelope position and text visibility can vary",
            "scene_heading": "INT. KITCHEN - NIGHT",
            "scene_change": False
        }
    ]
}, indent=2)


# ── Example 2: THE GOLD GROUP GALA (Corporate Revenge) ────────────────
_EXAMPLE_2_INPUT = (
    'Turn this idea into a 1-minute vertical episode with exactly 8 scenes:\n\n'
    'IDEA: "A woman returns to the gala of the company that destroyed her — but '
    'she\'s no longer a guest. She\'s the new CEO."\n'
    'STYLE: Cinematic (photorealistic, shot on 35mm film)'
)

_EXAMPLE_2_OUTPUT = json.dumps({
    "ingredients": {
        "protagonist": "Alexandra, ex-fianc\u00e9e returning with power no one expected",
        "conflict_source": "Max, who erased her and took the throne she built",
        "immediate_tension": "Alexandra walks into the gala alone \u2014 Max freezes mid-laugh",
        "secret": "Alexandra has already been named CEO \u2014 no one at the gala knows yet",
        "spike_moment": "Alexandra calmly announces she's the new CEO to Max's face",
        "cliff_problem": "Alexandra whispers 'You still work for me' \u2014 Max is trapped under her authority"
    },
    "characters": [
        {
            "id": "alexandra",
            "name": "Alexandra",
            "gender": "female",
            "age": "early 30s",
            "appearance": "Black floor-length gown, hair swept back tight, minimal jewelry, posture razor-straight, calm eyes that miss nothing",
            "role": "protagonist"
        },
        {
            "id": "max",
            "name": "Max",
            "gender": "male",
            "age": "mid-30s",
            "appearance": "Tailored charcoal suit, silver cufflinks he keeps adjusting, confident smile that cracks under pressure, champagne glass always in hand",
            "role": "antagonist"
        },
        {
            "id": "vanessa",
            "name": "Vanessa",
            "gender": "female",
            "age": "late 20s",
            "appearance": "Red cocktail dress, arm permanently hooked through Max's, sharp smile, diamond earrings catching chandelier light",
            "role": "supporting"
        }
    ],
    "locations": [
        {
            "id": "loc_1",
            "name": "Grand Ballroom",
            "description": "Crystal chandeliers, champagne towers, marble floor reflecting golden light, stage with podium at far end, floor-to-ceiling windows draped in velvet",
            "atmosphere": "Opulent power arena, old money elegance masking cutthroat ambition"
        }
    ],
    "scenes": [
        {
            "scene_number": 1,
            "title": "The Entrance",
            "duration": "7 seconds",
            "characters_on_screen": ["alexandra", "max"],
            "setting_id": "loc_1",
            "action": ["Crystal chandeliers. Champagne. Power everywhere.", "Alexandra enters. Alone.", "Across the room\u2014", "Max freezes mid-laugh.", "He wasn't expecting her.", "He disengages immediately.", "Predator focus.", "Moves toward her."],
            "dialogue": None,
            "image_prompt": "Wide shot of grand ballroom from entrance. Alexandra's black silhouette framed in doorway against golden light. Deep in the room, Max's head snaps toward her mid-conversation. Champagne glass suspended. Crowd blurred between them. Chandeliers overhead.",
            "regenerate_notes": "Crowd density and chandelier detail can vary",
            "scene_heading": "INT. GRAND BALLROOM - NIGHT",
            "scene_change": False
        },
        {
            "scene_number": 2,
            "title": "The Introduction",
            "duration": "8 seconds",
            "characters_on_screen": ["alexandra", "max", "vanessa"],
            "setting_id": "loc_1",
            "action": ["Vanessa clings tighter to his arm.", "Alexandra holds eye contact.", "Beat."],
            "dialogue": "MAX: Alexandra.\nVANESSA: Oh. This is her?\nMAX: My ex-fianc\u00e9e.\nVANESSA: You look\u2026 different than I imagined.",
            "image_prompt": "Medium three-shot. Max centered, Vanessa pressed against his right arm gripping tight. Alexandra facing them, shoulders back, chin level. Champagne flutes on a tray between them. Vanessa's smirk. Alexandra's stillness. Max's locked jaw.",
            "regenerate_notes": "Background guests and tray position can vary",
            "scene_heading": "INT. GRAND BALLROOM - NIGHT",
            "scene_change": False
        },
        {
            "scene_number": 3,
            "title": "The Promotion",
            "duration": "8 seconds",
            "characters_on_screen": ["alexandra", "max"],
            "setting_id": "loc_1",
            "action": ["He adjusts his cuff.", "He leans closer.", "He watches for damage."],
            "dialogue": "MAX: You picked an interesting night to show up.\nMAX: Senior VP. As of last week.\nMAX: Funny how removing the wrong person fixes everything.",
            "image_prompt": "Tight two-shot, Max leaning toward Alexandra. His fingers on his silver cufflink, sleeve crisp. Her face composed, unreadable. His eyes scanning hers for cracks. Golden chandelier light warm on his confident expression. She gives him nothing.",
            "regenerate_notes": "Cufflink detail and lean angle can vary",
            "scene_heading": "INT. GRAND BALLROOM - NIGHT",
            "scene_change": False
        },
        {
            "scene_number": 4,
            "title": "The Reveal",
            "duration": "8 seconds",
            "characters_on_screen": ["alexandra", "max"],
            "setting_id": "loc_1",
            "action": ["Alexandra doesn't flinch.", "Beat.", "Silence.", "Max blinks.", "Then laughs."],
            "dialogue": "ALEXANDRA: Congratulations.\nALEXANDRA: I'm the new CEO.\nMAX: You always did love fantasy.",
            "image_prompt": "Close-up on Alexandra's face. Zero expression. Then cut to Max \u2014 smile frozen, eyes blinking fast. His champagne glass tilts slightly in his grip. Behind them the gala continues, oblivious. The space between their faces charged.",
            "regenerate_notes": "Max's reaction intensity and glass angle can vary",
            "scene_heading": "INT. GRAND BALLROOM - NIGHT",
            "scene_change": False
        },
        {
            "scene_number": 5,
            "title": "The Dismissal",
            "duration": "7 seconds",
            "characters_on_screen": ["alexandra", "max", "vanessa"],
            "setting_id": "loc_1",
            "action": ["Vanessa smirks.", "Security begins drifting closer.", "Quiet. Final."],
            "dialogue": "VANESSA: This is embarrassing.\nMAX: You shouldn't be here, Alex.\nMAX: Leave before they make you.",
            "image_prompt": "Wide medium shot. Vanessa's smirk from behind Max's shoulder. Two security guards visible approaching in soft focus. Max's posture shifts \u2014 shoulders squared, jaw out. Alexandra stands motionless. The power triangle tilted against her.",
            "regenerate_notes": "Security guard positions and background guests can vary",
            "scene_heading": "INT. GRAND BALLROOM - NIGHT",
            "scene_change": False
        },
        {
            "scene_number": 6,
            "title": "The Spotlight",
            "duration": "7 seconds",
            "characters_on_screen": ["alexandra", "max"],
            "setting_id": "loc_1",
            "action": ["The lights dim.", "A microphone crackles.", "Max doesn't break eye contact.", "Certain of his dominance.", "Spotlight ignites.", "Directly on Alexandra."],
            "dialogue": None,
            "image_prompt": "Ballroom goes dark except for a single spotlight slamming onto Alexandra. Max in foreground shadow, face half-lit, still staring. She stands perfectly still in the white beam. The crowd a sea of dark silhouettes. Stage podium visible behind her.",
            "regenerate_notes": "Spotlight color temperature and crowd density can vary",
            "scene_heading": "INT. GRAND BALLROOM - NIGHT",
            "scene_change": False
        },
        {
            "scene_number": 7,
            "title": "The Shatter",
            "duration": "8 seconds",
            "characters_on_screen": ["alexandra", "max", "vanessa"],
            "setting_id": "loc_1",
            "action": ["Applause detonates.", "Max's smile collapses.", "Vanessa releases his arm.", "Security stops moving.", "Max's champagne glass slips\u2014", "SHATTERS."],
            "dialogue": None,
            "image_prompt": "Max's face in close-up \u2014 smile crumbling in real time. Vanessa's hand releasing his arm visible at frame edge. Below: champagne glass mid-shatter on marble floor, golden liquid spraying. Applause light flashing across stunned faces in the background.",
            "regenerate_notes": "Glass shatter pattern and Vanessa's position can vary",
            "scene_heading": "INT. GRAND BALLROOM - NIGHT",
            "scene_change": False
        },
        {
            "scene_number": 8,
            "title": "The Whisper",
            "duration": "7 seconds",
            "characters_on_screen": ["alexandra", "max"],
            "setting_id": "loc_1",
            "action": ["Alexandra steps toward the stage.", "Stops beside Max.", "Leans in.", "Quiet. Only for him.", "She walks away.", "Max stands frozen.", "Destroyed.", "Hard cut to black."],
            "dialogue": "ALEXANDRA: You still work for me.",
            "image_prompt": "Alexandra leans to Max's ear in tight profile shot. Her lips barely moving. His eyes wide, staring forward at nothing. Her black gown against his grey suit. Behind them the stage glows. She pulls back and walks toward the light. He doesn't move.",
            "regenerate_notes": "Lean angle and stage background can vary",
            "scene_heading": "INT. GRAND BALLROOM - NIGHT",
            "scene_change": False
        }
    ]
}, indent=2)


# ── Example 3: THE LAST DRAGON HEIR (Fantasy) ────────────────────────
_EXAMPLE_3_INPUT = (
    'Turn this idea into a 1-minute vertical episode with exactly 8 scenes:\n\n'
    'IDEA: "A disguised servant girl is dragged before the conquering king — but she '
    'carries the blood of the dragons he thought he destroyed."\n'
    'STYLE: Cinematic (photorealistic, shot on 35mm film)'
)

_EXAMPLE_3_OUTPUT = json.dumps({
    "ingredients": {
        "protagonist": "Elira, disguised servant hiding dragon blood in a conquered kingdom",
        "conflict_source": "King Varos, ruthless conqueror sitting on a stolen throne",
        "immediate_tension": "Soldiers drag Elira into the throne room \u2014 she was found in the forbidden dragon wing",
        "secret": "Elira is the last surviving dragon heir \u2014 a glowing mark burns beneath her skin",
        "spike_moment": "Varos grabs her wrist and discovers the dragon bloodline mark",
        "cliff_problem": "A dragon roars overhead \u2014 something ancient has awoken in response to her presence"
    },
    "characters": [
        {
            "id": "elira",
            "name": "Elira",
            "gender": "female",
            "age": "19",
            "appearance": "Torn servant robes over lean frame, dirt-streaked face hiding sharp features, dark braided hair half-undone, bare feet on stone, trembling hands she fights to still",
            "role": "protagonist"
        },
        {
            "id": "varos",
            "name": "King Varos",
            "gender": "male",
            "age": "mid-40s",
            "appearance": "Black iron crown on close-cropped grey hair, leather-and-plate armor over broad chest, scarred knuckles gripping throne arms, predator's stillness in dark eyes",
            "role": "antagonist"
        }
    ],
    "locations": [
        {
            "id": "loc_1",
            "name": "Throne Room",
            "description": "Conquered castle throne room, massive dragon skull mounted above stolen throne, torchlight flickering on stone walls, cracked mosaic floor depicting dragons, heavy iron doors",
            "atmosphere": "Ancient power desecrated, oppressive grandeur, torch-smoke heaviness"
        }
    ],
    "scenes": [
        {
            "scene_number": 1,
            "title": "The Dragging",
            "duration": "7 seconds",
            "characters_on_screen": ["elira", "varos"],
            "setting_id": "loc_1",
            "action": ["The throne room doors slam open.", "Soldiers drag Elira inside.", "She struggles.", "She freezes.", "She recognizes the voice."],
            "dialogue": "ELIRA: I told you, I'm just a servant\u2014\nVAROS: Bring her closer.",
            "image_prompt": "Wide shot from behind throne. Massive doors thrown open, daylight flooding in. Two soldiers drag a struggling girl across cracked mosaic floor. Dragon skull looms above the throne in shadow. Varos a dark silhouette on the throne. Torches flicker on stone walls.",
            "regenerate_notes": "Number of soldiers and door opening angle can vary",
            "scene_heading": "INT. THRONE ROOM - DAY",
            "scene_change": False
        },
        {
            "scene_number": 2,
            "title": "The Accusation",
            "duration": "8 seconds",
            "characters_on_screen": ["elira", "varos"],
            "setting_id": "loc_1",
            "action": ["Varos sits on a throne that doesn't belong to him.", "Dragon skull above his head.", "He studies her."],
            "dialogue": "VAROS: You were found in the dragon wing.\nELIRA: I clean where I'm told.\nVAROS: You weren't cleaning.\nVAROS: You were looking.",
            "image_prompt": "Low angle up at Varos on the throne. Dragon skull centered above his iron crown. His fingers steepled. Elira small in the foreground, held by soldiers. Torchlight catches his scarred knuckles. His eyes locked on her like prey.",
            "regenerate_notes": "Throne detail and torch positions can vary",
            "scene_heading": "INT. THRONE ROOM - DAY",
            "scene_change": False
        },
        {
            "scene_number": 3,
            "title": "The Approach",
            "duration": "8 seconds",
            "characters_on_screen": ["elira", "varos"],
            "setting_id": "loc_1",
            "action": ["He stands.", "Walks down toward her.", "Beat.", "He's close now.", "Too close."],
            "dialogue": "VAROS: Do you know what lived here before me?\nELIRA: No.\nVAROS: Liars don't tremble like that.",
            "image_prompt": "Varos descending stone steps toward Elira. Shot from her eye level \u2014 he towers. His boot on the final step. Dragon skull far above and behind. She looks down, jaw clenched. His shadow falls across her. Less than two feet between them.",
            "regenerate_notes": "Step count and shadow angle can vary",
            "scene_heading": "INT. THRONE ROOM - DAY",
            "scene_change": False
        },
        {
            "scene_number": 4,
            "title": "The Mark",
            "duration": "8 seconds",
            "characters_on_screen": ["elira", "varos"],
            "setting_id": "loc_1",
            "action": ["He grabs her wrist.", "Turns it upward.", "A faint glowing mark burns beneath her skin.", "Gasps from the soldiers.", "Beat.", "She whispers\u2014"],
            "dialogue": "VAROS: Impossible.\nVAROS: The dragon bloodline is dead.\nELIRA: No.\nELIRA: You missed one.",
            "image_prompt": "Extreme close-up of her wrist in his grip. A glowing amber mark pulses beneath her skin like an ember. His scarred fingers wrapped around her forearm. Both faces visible \u2014 his shock, her defiance finally surfacing. Torchlight and mark-glow competing on their skin.",
            "regenerate_notes": "Mark design and glow intensity can vary",
            "scene_heading": "INT. THRONE ROOM - DAY",
            "scene_change": False
        },
        {
            "scene_number": 5,
            "title": "No Fear",
            "duration": "7 seconds",
            "characters_on_screen": ["elira", "varos"],
            "setting_id": "loc_1",
            "action": ["Silence swallows the room.", "Varos stares at the mark.", "Hungry.", "She meets his eyes.", "No fear now."],
            "dialogue": "VAROS: Do you know what you are?\nELIRA: Yes.",
            "image_prompt": "Two-shot at eye level. Varos still holding her wrist, but his grip has loosened. His expression shifted from power to hunger. She looks directly at him \u2014 chin up, eyes clear. The mark still glowing faintly between them. Soldiers frozen in background.",
            "regenerate_notes": "Soldier positions and mark brightness can vary",
            "scene_heading": "INT. THRONE ROOM - DAY",
            "scene_change": False
        },
        {
            "scene_number": 6,
            "title": "The Tremor",
            "duration": "7 seconds",
            "characters_on_screen": ["elira", "varos"],
            "setting_id": "loc_1",
            "action": ["A deep rumble shakes the castle.", "Dust falls from the ceiling.", "Soldiers panic.", "Another rumble.", "Closer.", "Something ancient waking."],
            "dialogue": None,
            "image_prompt": "Wide shot of throne room shaking. Dust cascading from ceiling cracks. Torches swaying. Soldiers stumbling, hands on sword hilts. Varos and Elira motionless at center while the world trembles around them. Stone chips falling from dragon skull mount above.",
            "regenerate_notes": "Dust volume and shake intensity can vary",
            "scene_heading": "INT. THRONE ROOM - DAY",
            "scene_change": False
        },
        {
            "scene_number": 7,
            "title": "It Felt Me",
            "duration": "8 seconds",
            "characters_on_screen": ["elira", "varos"],
            "setting_id": "loc_1",
            "action": ["Varos tightens his grip on her wrist.", "The throne room trembles harder.", "Stone cracking."],
            "dialogue": "VAROS: What did you do?\nELIRA: I didn't do anything.\nELIRA: It felt me.",
            "image_prompt": "Close-up of Varos gripping her wrist harder. His knuckles white. The mark blazing amber now. Behind them, a crack races up the stone wall. The dragon skull shifts on its mount. His face caught between fury and fear for the first time.",
            "regenerate_notes": "Crack pattern and mark intensity can vary",
            "scene_heading": "INT. THRONE ROOM - DAY",
            "scene_change": False
        },
        {
            "scene_number": 8,
            "title": "The Roar",
            "duration": "7 seconds",
            "characters_on_screen": ["elira", "varos"],
            "setting_id": "loc_1",
            "action": ["A massive shadow passes over the throne room.", "Soldiers look up.", "Terrified.", "A deafening DRAGON ROAR splits the sky.", "Varos slowly looks back at her.", "She smiles.", "Hard cut to black."],
            "dialogue": None,
            "image_prompt": "Low angle looking up through throne room skylight. A massive winged shadow darkens the glass. Soldiers cowering below. Varos turned back toward Elira \u2014 his face drained. She stands in the center of chaos, mark blazing, a small smile forming. Hard cut to black.",
            "regenerate_notes": "Dragon shadow size and soldier positions can vary",
            "scene_heading": "INT. THRONE ROOM - DAY",
            "scene_change": False
        }
    ]
}, indent=2)


# ── Assembled few-shot list ───────────────────────────────────────────
STORY_FEW_SHOT_EXAMPLES = [
    {"user": _EXAMPLE_1_INPUT, "model": _EXAMPLE_1_OUTPUT},
    {"user": _EXAMPLE_2_INPUT, "model": _EXAMPLE_2_OUTPUT},
    {"user": _EXAMPLE_3_INPUT, "model": _EXAMPLE_3_OUTPUT},
]
