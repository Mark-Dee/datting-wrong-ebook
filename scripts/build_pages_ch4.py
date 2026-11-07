import json

def write_ts_file(filepath, var_name, pages):
    code = f"import {{ BookPage }} from '../../types.ts';\n\nexport const {var_name}: BookPage[] = {json.dumps(pages, ensure_ascii=False, indent=2)};\n"
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(code)
    print(f"Wrote {len(pages)} pages to {filepath}")

# CHAPTER FOUR: Pages 60 to 79 (Folio 53 to 72)
pages_ch4 = [
    {
        "pageNumber": 60,
        "pdfPageNumber": 60,
        "folioLabel": "53",
        "totalNumberedPages": 122,
        "sectionId": "chapter-four",
        "type": "chapter-start",
        "chapterNumberLabel": "Chapter Four",
        "chapterTitle": "Unexamined Scars & The Circle of Betrayal",
        "runningHeader": "CHAPTER FOUR · UNEXAMINED SCARS & THE CIRCLE OF BETRAYAL",
        "content": {
            "paragraphs": [
                "**CHAPTER FOUR**",
                "The promise sounded remarkably mature when I made it.",
                "*I will never again enter a relationship without being certain of what I want.*",
                "I said those words to myself with the easy confidence of a man who believed he had finally decoded the mechanics of love. I had already survived the wreckage of betrayal. I had tasted the slow, bitter decay of incompatibility. I had allowed the loud opinions of people around me to influence choices that should have belonged strictly to me. Worse still, I had once used another human being as an emotional bandage, a shield against the lingering pain left behind by someone I had loved before her.",
                "I thought the scars had taught me enough. I thought heartbreak had graduated me. I thought I had become wiser.",
                "Perhaps that very confidence was my first mistake. Surviving heartbreak does not automatically mean you have learned everything you need to know; sometimes, it only means you have become more adept at carrying the weight of the damage.",
                "I was about to discover that a man can enter a new chapter with noble intentions and still carry the old, unexamined version of himself right through the front door.",
                "By the time I met Mumbi, I was emotionally exhausted. I had zero appetite for games, subtle psychological warfare, or relationships that required me to spend every waking hour guessing where I stood. I did not want another partner who made me feel as though I was navigating a minefield in heavy boots.",
                "I wanted something simple. Something peaceful. Something that could grow naturally toward permanence."
            ]
        }
    },
    {
        "pageNumber": 61,
        "pdfPageNumber": 61,
        "folioLabel": "54",
        "totalNumberedPages": 122,
        "sectionId": "chapter-four",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Four",
        "chapterTitle": "Unexamined Scars & The Circle of Betrayal",
        "runningHeader": "CHAPTER FOUR · UNEXAMINED SCARS & THE CIRCLE OF BETRAYAL",
        "content": {
            "paragraphs": [
                "Then I met Mumbi at the campus church.",
                "There was a quiet elegance to her that instantly commanded the room. She was striking light-skinned, meticulously put together, and carrying herself with a calm self-assurance that made her stand out without ever having to raise her voice or demand attention. She was the kind of woman a man could admire from across a crowded sanctuary and think, *There is something genuinely different about her.*",
                "But it wasn't just her appearance that caught me. I saw potential. I saw the foundational qualities I believed would make a grounding, steady partner. Because of everything I had endured prior to that season, I was perhaps too eager to believe I had finally found the living contrast to my past trauma.",
                "*Maybe this is the one.*",
                "That thought arrived with dangerous speed. I approached her. She accepted. And just like that, another chapter began.",
                "At first, everything felt effortless. We went on dates, spent our free hours lingering around campus, visited each other’s places, and talked on the phone late into the night until sleep reluctantly cut off conversations neither of us wanted to end.",
                "There were quiet evenings when we discussed life with a depth that made it feel as though we had known each other for years. There were mornings when a simple text from her could recalibrate the entire trajectory of my day. I became deeply invested in her, perhaps far too quickly.",
                "I began measuring her against every painful experience that had come before. Where others had brought ambiguity, Mumbi seemed to bring clarity. Where others had triggered my suspicion, Mumbi seemed entirely trustworthy. Where others had drained my energy, she seemed to restore it."
            ]
        }
    },
    {
        "pageNumber": 62,
        "pdfPageNumber": 62,
        "folioLabel": "55",
        "totalNumberedPages": 122,
        "sectionId": "chapter-four",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Four",
        "chapterTitle": "Unexamined Scars & The Circle of Betrayal",
        "runningHeader": "CHAPTER FOUR · UNEXAMINED SCARS & THE CIRCLE OF BETRAYAL",
        "content": {
            "paragraphs": [
                "I convinced myself that my past heartbreaks were merely preparatory steps leading me straight to her. I was certain I had finally located the right woman.",
                "Church became a cornerstone of our shared routine. As a pastor’s son, I had grown up within the rhythms of ministry, so having Mumbi beside me during Sunday services felt natural, almost predestined. After the service, I would take her for lunch. We would sit at a small local spot, talking long after our plates were cleared. Afterward, I would walk her home. It became our rhythm: Church. Lunch. Conversation. Escorting her home. Calling later in the evening. Repeating it all over again.",
                "Our connection seemed healthy and promising. At least, that is what I allowed myself to believe.",
                "There was, however, one habit of Mumbi’s that grated on me early on. She was not particularly a lover of exclusive boundaries in public spaces. Whenever we walked together across campus and encountered one of her male friends, she would stop dead in her tracks. There would be a warm, prolonged embrace, followed by animated conversation and suddenly, I was no longer the man walking beside her. I became the third wheel standing two steps back, waiting like an awkward hired guard while two old acquaintances caught up.",
                "Sometimes I would pull out my phone, pretending to scroll through messages I didn’t care about. Other times, I would stare at the road and silently count the seconds. Five minutes. Ten minutes. Fifteen.",
                "Eventually, she would step back toward me as if nothing out of the ordinary had occurred. \"Sorry about that,\" she would say lightly, adjusting her bag.",
                "And we would keep walking."
            ]
        }
    },
    {
        "pageNumber": 63,
        "pdfPageNumber": 63,
        "folioLabel": "56",
        "totalNumberedPages": 122,
        "sectionId": "chapter-four",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Four",
        "chapterTitle": "Unexamined Scars & The Circle of Betrayal",
        "runningHeader": "CHAPTER FOUR · UNEXAMINED SCARS & THE CIRCLE OF BETRAYAL",
        "content": {
            "paragraphs": [
                "It bothered me. I knew it bothered me. But I was in love, so I gave the behavior a harmless name that allowed me to bypass the discomfort.",
                "*She’s just social. That’s simply her personality. There’s nothing to worry about.* Having already experienced enough relationship friction, I was terrified of becoming the overbearing, suspicious boyfriend who interrogated every handshake and hug. So I chose to trust blindly.",
                "Looking back now, I have to ask: How many red flags do we rebrand as harmless personality quirks simply because we are terrified of what we might discover if we take them seriously? As our relationship matured, the community around us took notice. My friends saw the way I looked at Mumbi, how consistently we moved together, and how effortlessly we appeared to be charting a path past university life.",
                "They validated me at every turn.",
                "\"You finally got it right, Gerishon,\" one of my close friends told me over tea one afternoon. \"Don't lose this one.\"",
                "\"She’s grounded, man. She’s good for you,\" another added. \"Hold on to her.\"",
                "Their approval reinforced my internal narrative: *I had chosen correctly.*",
                "Whenever they urged me to keep her, I answered with quiet pride. \"I will. I'm completely serious about her. I want this to go the distance.\"",
                "I truly believed it. I began envisioning a long-term trajectory, not an immediate wedding, but a sustained life beyond campus. I wasn't merely dating Mumbi; I was actively building a mental house around a future with her.",
                "Which is precisely why what happened next cut so deep.",
                "***"
            ]
        }
    },
    {
        "pageNumber": 64,
        "pdfPageNumber": 64,
        "folioLabel": "57",
        "totalNumberedPages": 122,
        "sectionId": "chapter-four",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Four",
        "chapterTitle": "Unexamined Scars & The Circle of Betrayal",
        "runningHeader": "CHAPTER FOUR · UNEXAMINED SCARS & THE CIRCLE OF BETRAYAL",
        "content": {
            "paragraphs": [
                "It took place during an informal weekend hangout. I had brought Mumbi along to join a few of my friends. It was supposed to be an uncomplicated afternoon, music, relaxed banter, and the temporary freedom of having nowhere urgent to be.",
                "By nature and by training as a journalist, I am a social person. I am genuinely curious about human stories, where people come from, how they think, what shapes their worldview. During the event, I crossed paths with a woman I hadn't met before. We struck up a casual conversation. There was no secret exchange, no hidden flirtation, and no ulterior motive. We simply hit it off as fellow students, laughing and swapping campus stories. I was operating in my natural social element.",
                "Mumbi, however, saw something entirely different.",
                "She went quiet. Not an ordinary silence, but the heavy, suffocating kind that instantly shifts the temperature of a room. I noticed her retreat from the group dynamic. I looked over at her once, then twice, but I didn't probe. Perhaps I assumed that if something were truly wrong, she would speak up. Perhaps I was too relaxed, or perhaps I simply could not conceive that a harmless, open conversation could trigger a structural fault line in our relationship.",
                "The afternoon ended, and we departed for our respective hostels.",
                "That night, when we tuned in for our regular late-night phone call, I was expecting the usual Mumbi. Instead, my screen illuminated with a text message that remains etched in my memory.",
                "“I am deeply disappointed in you, Gerishon. Watching you today showed me a side of you I didn't sign up for. It changed how I view you entirely. I don't think we should continue this.” I reread the message twice. My initial reaction was sheer disbelief. *Seriously? Over that?* There are moments when"
            ]
        }
    },
    {
        "pageNumber": 65,
        "pdfPageNumber": 65,
        "folioLabel": "58",
        "totalNumberedPages": 122,
        "sectionId": "chapter-four",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Four",
        "chapterTitle": "Unexamined Scars & The Circle of Betrayal",
        "runningHeader": "CHAPTER FOUR · UNEXAMINED SCARS & THE CIRCLE OF BETRAYAL",
        "content": {
            "paragraphs": [
                "your heart wants to ask questions, but your pride gets to the door first. I could have called her immediately. I could have asked her to walk me through her hurt. I could have validated her feelings of disrespect, even if my intention had been completely pure.",
                "Instead, I went cold.",
                "I drafted a detached, clinical response that implied the relationship was easily disposable. I didn't fight. I didn't clarify. I didn't request a sit-down. I simply let the door slam shut. I went to sleep that night clinging to the false comfort of a man who thought he had preserved his dignity. I failed to realize that pride rarely protects your dignity more often, it simply prevents you from restoring what was worth saving.",
                "What followed was a slow, confusing blur.",
                "Over the coming days, Mumbi and I somehow slipped back into regular contact. We talked, shared laughs, met up on campus, and interacted almost as if the breakup text had never been sent. I convinced myself that the storm had blown over. She reconsidered. She got past it. We survived our first real test. I chose the path of least resistance.",
                "Then Kipketer Jacob (Keter) entered the frame.",
                "At first, I only noticed them together from a distance. Then their interactions grew increasingly frequent. Whenever Keter was in her vicinity, Mumbi’s posture changed entirely. She showered him with undivided attention, laughed at his jokes, and walked shoulder-to-shoulder with him.",
                "When she knew I was nearby, it felt deliberate, as though she were intentionally orchestrating a performance designed to send a single, clear message: *Look how easily you can be replaced.*"
            ]
        }
    },
    {
        "pageNumber": 66,
        "pdfPageNumber": 66,
        "folioLabel": "59",
        "totalNumberedPages": 122,
        "sectionId": "chapter-four",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Four",
        "chapterTitle": "Unexamined Scars & The Circle of Betrayal",
        "runningHeader": "CHAPTER FOUR · UNEXAMINED SCARS & THE CIRCLE OF BETRAYAL",
        "content": {
            "paragraphs": [
                "The realization was painful, yet my brain actively resisted accepting it. I kept telling myself it was a harmless friendship. But the double life she was running grew maddening. When Keter wasn't around, Mumbi and I could still sit together and talk naturally. For an hour, we were the same couple who used to linger after church. But the moment Keter appeared, I became invisible.",
                "The contradiction ate away at me. *What are we actually doing? Did she really break things off? If we're done, why does she act like my partner when we're alone? If she cares about him, why is she still holding onto me? Is this revenge? Or am I just the last one to realize I've been benched?*",
                "The questions stacked up until they became an exhausting loop. And behind them lay the heaviest question of all: *Why do I keep winding up in these ambiguous, emotionally draining situations?*",
                "I thought I understood disappointment. But this felt different because I had taken such calculated steps to choose \"right\" this time.",
                "***",
                "What I did not understand then was that Mumbi’s actions were not being driven entirely by me, Keter, or the afternoon at the hangout. Her story had begun long before I entered the frame, shaped by a history of attachment and abandonment I knew nothing about. When Mumbi first arrived on campus as a freshman, she was wide-eyed and navigating university life with that familiar mix of freedom and vulnerability. On her registration day, she met **Otombo Gabby**.",
                "Their bond formed rapidly. They walked to lectures together, shared lunches, worked through study sheets, and every evening, Otombo would escort her back to her hostel. Day in, day out, he became her steady anchor."
            ]
        }
    },
    {
        "pageNumber": 67,
        "pdfPageNumber": 67,
        "folioLabel": "60",
        "totalNumberedPages": 122,
        "sectionId": "chapter-four",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Four",
        "chapterTitle": "Unexamined Scars & The Circle of Betrayal",
        "runningHeader": "CHAPTER FOUR · UNEXAMINED SCARS & THE CIRCLE OF BETRAYAL",
        "content": {
            "paragraphs": [
                "Predictably, Otombo’s feelings deepened. To him, Mumbi wasn't just a classmate; she was the woman he wanted to build a future with. He assumed their daily intimacy meant they were moving toward the same destination. He didn't realize someone was watching from the sidelines.",
                "His name was **Abayomi Agu**, a charismatic Nigerian student from Lagos who ironically was one of Otombo’s friends through their church fellowship. They shared meals, discussed life, and trusted each other. That existing trust made what Abayomi did next all the more devastating.",
                "Abayomi decided he wanted Mumbi.",
                "He didn't pursue her quietly. He came with grand visions, talking of Lagos, real estate, luxury, and a life far grander than the modest reality of campus living. But beyond the material promises, Abayomi positioned himself as her ultimate emotional confidant. When she was stressed, he validated her. When she felt insecure, he spoke to her potential. He patiently engineered a space for himself right in the middle of her world.",
                "Slowly, Mumbi’s warmth toward Otombo began to cool. Her calls grew shorter, her availability shrank, and the evening walks ceased. Otombo felt the shift, but he couldn't imagine that the architect of his heartbreak was his close friend.",
                "The truth revealed itself brutally one evening. Otombo walked to Mumbi’s hostel to drop off a set of revision notes. As he rounded the corner near the entrance, he saw them under the dim light: Mumbi and Abayomi, locked in an intimate kiss.",
                "Otombo froze. The world went quiet around him. Months of shared routines, quiet conversations, and unspoken promises collapsed in an instant. He could have confronted them; he could have raised his voice. Instead, he stood in silence for a few seconds, turned around, and walked back into the dark."
            ]
        }
    },
    {
        "pageNumber": 68,
        "pdfPageNumber": 68,
        "folioLabel": "61",
        "totalNumberedPages": 122,
        "sectionId": "chapter-four",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Four",
        "chapterTitle": "Unexamined Scars & The Circle of Betrayal",
        "runningHeader": "CHAPTER FOUR · UNEXAMINED SCARS & THE CIRCLE OF BETRAYAL",
        "content": {
            "paragraphs": [
                "Abayomi and Mumbi became official. But promises built on momentum and romantic grandiosity eventually have to face reality.",
                "When Abayomi finished his degree, he packed his bags and moved back to Nigeria. Distance quickly eroded what attraction had built. The calls thinned out, the grand plans for Lagos dissolved into vague excuses, and eventually, the relationship died a quiet death.",
                "Once again, Mumbi was left holding the pieces of a promise that had expired.",
                "Then came Deno.",
                "Following the collapse of her relationship with Abayomi, Mumbi was isolated and desperate for practical stability. Deno was her neighbor, a quiet, hands-on guy who worked for a local electrical company.",
                "Late one night, Mumbi went to take a shower, and the electric heating unit began throwing sparks. Panicked, she called Deno. It was past midnight, but he showed up immediately, tool bag in hand, and resolved the issue.",
                "The repair turned into a late-night conversation. They realized that despite living next door to each other, they knew almost nothing about one another's lives. Late-night conversations turned into shared dinners, which turned into an intense, domestic relationship.",
                "Within months, Mumbi moved out of her unit and into Deno’s apartment.",
                "To the outside world, they functioned like a married couple. They shared domestic routines, split bills, and built a cozy, insular world. But beneath the surface, friction was constant. Deno grew increasingly critical of her character, frequently questioning her choices and social habits. Misunderstandings were swept under the rug rather than resolved."
            ]
        }
    },
    {
        "pageNumber": 69,
        "pdfPageNumber": 69,
        "folioLabel": "62",
        "totalNumberedPages": 122,
        "sectionId": "chapter-four",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Four",
        "chapterTitle": "Unexamined Scars & The Circle of Betrayal",
        "runningHeader": "CHAPTER FOUR · UNEXAMINED SCARS & THE CIRCLE OF BETRAYAL",
        "content": {
            "paragraphs": [
                "One evening, Mumbi went to the market, bought groceries, and cooked an elaborate dinner for Deno. She sat down to wait for him to return from work. Eight o'clock passed. Ten o'clock passed. Midnight arrived.",
                "Deno never came home.",
                "His phone was switched off. His social media went dark. No note, no argument, no final conversation. Just total absence.",
                "Days later, Mumbi discovered through mutual contacts that Deno had been laid off from his job that afternoon, packed up his belongings while she was out, and moved back to his home county permanently.",
                "Just like that, her entire domestic life disappeared overnight.",
                "Three relationships. Three abrupt endings. Mumbi was left carrying a deep, unhealed belief that intimacy was inherently temporary and that people would inevitably abandon or replace her.",
                "After Deno’s sudden departure, Mumbi changed her approach. She stopped seeking immediate male validation and tried to ground herself. She started attending the campus church consistently, seeking spiritual order and a fresh start. She wanted to believe her narrative could change.",
                "That was precisely the season when our paths crossed.",
                "I came into her life entirely blind to this history. I didn't know about Otombo’s quiet heartbreak, Abayomi’s empty grandiosity, or Deno’s midnight vanishing act. I didn't know how deeply wounded she was, nor how terrified she was of being rejected first. I simply saw a beautiful, poised woman in church, and convinced myself I had found my answers.",
                "***"
            ]
        }
    },
    {
        "pageNumber": 70,
        "pdfPageNumber": 70,
        "folioLabel": "63",
        "totalNumberedPages": 122,
        "sectionId": "chapter-four",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Four",
        "chapterTitle": "Unexamined Scars & The Circle of Betrayal",
        "runningHeader": "CHAPTER FOUR · UNEXAMINED SCARS & THE CIRCLE OF BETRAYAL",
        "content": {
            "paragraphs": [
                "When Keter eventually finished his program and relocated back to his hometown, the buffer vanished.",
                "His departure stripped away the noise and forced me to face what I had been delaying. There was no longer another man in the picture to blame for our instability. There was just Mumbi, me, and the unspoken tension between us.",
                "My friends had started asking awkward questions. The public confusion was getting embarrassing, and people at church had begun to notice the push-pull dynamic. I had spent months defending my commitment to her, asserting to anyone who would listen that she was the one I wanted. Now, I was confronting a painful truth: *Holding onto someone out of stubbornness is not the same as building a healthy life with them.*",
                "One Sunday after the service, I caught Mumbi near the edge of the courtyard. \"Mumbi, walk with me for a minute.\"",
                "We moved away from the lingering crowd, stopping near a quiet, tree-shaded wall.",
                "\"We need to talk,\" I said, keeping my voice level.",
                "She looked up, her expression guarded. \"About what?\"",
                "\"About us.\"",
                "A tired, faint smile touched her lips. \"There is no 'us' Gerishon.\"",
                "\"I know,\" I replied softly. \"Which is why this ambiguous pattern has to stop.\"",
                "\"What pattern?\"",
                "\"This back-and-forth. The uncertainty. The quiet competitions.\""
            ]
        }
    },
    {
        "pageNumber": 71,
        "pdfPageNumber": 71,
        "folioLabel": "64",
        "totalNumberedPages": 122,
        "sectionId": "chapter-four",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Four",
        "chapterTitle": "Unexamined Scars & The Circle of Betrayal",
        "runningHeader": "CHAPTER FOUR · UNEXAMINED SCARS & THE CIRCLE OF BETRAYAL",
        "content": {
            "paragraphs": [
                "Her eyes flashed with sudden emotion. \"You're the one who stopped fighting the moment things got uncomfortable.\"",
                "\"I know,\" I admitted. \"I made a mistake that night. I should have talked to you like a partner instead of retreating into pride.\"",
                "She looked away, down at the gravel.",
                "\"But we can't keep doing this,\" I continued. \"We can't be intimate and warm when we're alone, and then act like total strangers the second we're in public. I don't want to compete for your attention. I don't want to guess whether you're using someone else to get a reaction out of me. And I don't want to live in fear of when the next shift is coming.\"",
                "Her eyes glistened slightly. \"So you're walking away?\"",
                "\"I think we need to release each other completely. For real this time.\"",
                "\"For real?\"",
                "\"Yes.\"",
                "Silence hung heavy between us for a long moment. Then, she gave a single, slow nod.",
                "\"Take care of yourself, Gerishon.\"",
                "\"You too, Mumbi.\"",
                "I turned and walked across the courtyard. This time, I kept my eyes forward.",
                "I thought that clean break was the end of the chapter. It wasn't.",
                "In the weeks following our final conversation, Mumbi became increasingly isolated. Keter was gone, I was gone, and the emotional defense mechanisms"
            ]
        }
    },
    {
        "pageNumber": 72,
        "pdfPageNumber": 72,
        "folioLabel": "65",
        "totalNumberedPages": 122,
        "sectionId": "chapter-four",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Four",
        "chapterTitle": "Unexamined Scars & The Circle of Betrayal",
        "runningHeader": "CHAPTER FOUR · UNEXAMINED SCARS & THE CIRCLE OF BETRAYAL",
        "content": {
            "paragraphs": [
                "she had used for years seemed to collapse under the weight of her unresolved past.",
                "For a while, I heard very little about her. Campus life continued its relentless, noisy routine, and I tried to convince myself that whatever happened after our final conversation was no longer my business. Perhaps that was the healthiest boundary I could draw. Or perhaps I was simply building an emotional wall, trying to protect myself from hearing something I knew I wasn't ready to process.",
                "Then, a name began appearing in conversations I never expected.",
                "Trahov.",
                "Trahov was a friend of mine. He was from Russia, an international student at our university, and he had cultivated a very specific reputation around campus and the surrounding neighborhood. When men talked about him, it was usually with a mix of amusement and disbelief; when women and relationships came up, his name was the punchline. He was a known womanizer, a man who had slept with multiple women in the area and who made it abundantly clear that he had zero interest in anything permanent or meaningful.",
                "I knew exactly who he was. Yet, I trusted him as a friend.",
                "Which made what I was about to hear infinitely harder to digest.",
                "At first, I was entirely in the dark. But one of my classmates, **Mugendi**, had started noticing a pattern.",
                "One evening, Mugendi happened to see Mumbi walking alongside Trahov toward his apartment. He noted it, but thought little of it. University students moved around constantly; people visited each other’s rooms, friends crashed"
            ]
        }
    },
    {
        "pageNumber": 73,
        "pdfPageNumber": 73,
        "folioLabel": "66",
        "totalNumberedPages": 122,
        "sectionId": "chapter-four",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Four",
        "chapterTitle": "Unexamined Scars & The Circle of Betrayal",
        "runningHeader": "CHAPTER FOUR · UNEXAMINED SCARS & THE CIRCLE OF BETRAYAL",
        "content": {
            "paragraphs": [
                "on couches, study groups ran late. He didn't feel there was anything sinister worth discussing.",
                "The following morning, however, he saw them again. This time, Mumbi was walking out of",
                "Trahov’s place. Trahov was escorting her back.",
                "Mugendi noticed, but still, he said nothing. Perhaps he assumed it was a one-time lapse in judgment.",
                "But then it happened again.",
                "And again. And again.",
                "Not once. Not twice. Not even three times. The pattern became a glaring reality that was impossible to ignore. Eventually, Mugendi began to feel the weight of what he was watching, realizing that my friend and my former girlfriend were running a quiet, consistent routine right under my nose.",
                "One afternoon, he found me walking alone across the main campus quad.",
                "\"Gerishon,\" he called out.",
                "I stopped and turned. \"Mugendi. What's up?\"",
                "He slowed his pace as he reached me, looking at me for a long moment before speaking. \"There's something I need to tell you.\"",
                "The uncharacteristic gravity in his voice made my defenses rise immediately.",
                "\"About what?\"",
                "He hesitated, shifting his weight. \"About Mumbi.\""
            ]
        }
    },
    {
        "pageNumber": 74,
        "pdfPageNumber": 74,
        "folioLabel": "67",
        "totalNumberedPages": 122,
        "sectionId": "chapter-four",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Four",
        "chapterTitle": "Unexamined Scars & The Circle of Betrayal",
        "runningHeader": "CHAPTER FOUR · UNEXAMINED SCARS & THE CIRCLE OF BETRAYAL",
        "content": {
            "paragraphs": [
                "I felt a sudden, involuntary tightening in my chest. I hadn't heard her name spoken aloud in weeks, and certainly not with that kind of caution.",
                "\"What about her?\"",
                "Mugendi glanced around at the passing students before lowering his voice.",
                "\"I've seen her with Trahov.\"",
                "I frowned, my brain struggling to connect the two concepts. \"With Trahov?\"",
                "\"Yes.\"",
                "\"Doing what?\"",
                "\"Going to his place.\"",
                "I let out a short, dismissive breath, shrugging. \"Maybe they're just friends. People visit each other.\"",
                "Mugendi shook his head slowly. \"Gerishon, listen to me.\" He paused, letting the silence command my attention. \"I saw them going there one night.\" I remained quiet, the dismissal dying in my throat.",
                "\"The next morning, I saw them again. Trahov was walking her back.\"",
                "I looked at him, my pulse beginning to thrum in my ears. \"When?\"",
                "\"This has happened more than once.\"",
                "My stomach coiled into a hard knot. \"Are you sure?\"",
                "\"I wouldn't be standing here telling you if I wasn't.\"",
                "I broke eye contact, staring hard at the dusty ground between my shoes."
            ]
        }
    },
    {
        "pageNumber": 75,
        "pdfPageNumber": 75,
        "folioLabel": "68",
        "totalNumberedPages": 122,
        "sectionId": "chapter-four",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Four",
        "chapterTitle": "Unexamined Scars & The Circle of Betrayal",
        "runningHeader": "CHAPTER FOUR · UNEXAMINED SCARS & THE CIRCLE OF BETRAYAL",
        "content": {
            "paragraphs": [
                "Mugendi kept his voice low, steady. \"I didn't want to get involved, man. The first time, I thought maybe it was nothing. The second time, I still ignored it. But after seeing the exact same thing several times, I couldn't keep it to myself. I felt you needed to know.\"",
                "I swallowed the dryness in my throat. \"Are you saying they're sleeping together?\" Mugendi didn't answer immediately. He simply looked at me.",
                "That brief, heavy silence answered the question more violently than words ever could. My chest suddenly hollowed out. Trahov. My friend. Mumbi. The woman I had defended, invested in, and imagined a future with. The two names felt entirely irreconcilable, as if they belonged to two different universes.",
                "A bizarre urge to laugh bubbled up in my throat. I wanted to dismiss it. I wanted Mugendi to pat me on the back, tell me he was pulling a terrible prank, or admit he had misidentified them in the dark.",
                "Instead, I heard my own voice ask quietly, \"How many times?\"",
                "\"I don't know,\" Mugendi replied softly. \"But it wasn't a one-time thing.\"",
                "For a moment, the ambient noise of the campus around me completely vanished. Students were walking past us with backpacks. People were talking in groups on the grass. Someone was laughing loudly near the library stairs. A motorcycle engine revved out on the main road.",
                "I heard none of it.",
                "It felt as though I had been violently pushed underwater. The pressure against my ears was immense.",
                "I had already known betrayal in my life. I already knew the specific, sickening ache of losing someone you cared for. But this was an entirely different breed of pain. This time, the trespasser was not an anonymous"
            ]
        }
    },
    {
        "pageNumber": 76,
        "pdfPageNumber": 76,
        "folioLabel": "69",
        "totalNumberedPages": 122,
        "sectionId": "chapter-four",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Four",
        "chapterTitle": "Unexamined Scars & The Circle of Betrayal",
        "runningHeader": "CHAPTER FOUR · UNEXAMINED SCARS & THE CIRCLE OF BETRAYAL",
        "content": {
            "paragraphs": [
                "stranger. It was my friend. And the woman involved was someone whose honor I had guarded, someone I had loved.",
                "The reality of the information hit me slowly, seeping into the cracks, and then all at once a total collapse. It was like standing on the edge of a familiar street you walk down every day, only to blink and realize the entire landscape has been rearranged overnight into something hostile and unrecognizable.",
                "I didn't know what to say. My vocabulary completely failed me.",
                "Mugendi reached out and placed a firm hand on my shoulder. \"Gerishon, I didn't tell you this to hurt you.\"",
                "\"I know,\" I managed to whisper.",
                "\"I just thought you deserved the truth.\"",
                "I nodded slowly, still staring at the ground. \"Thank you.\"",
                "He gave my shoulder one last squeeze, then turned and walked away, blending back into the flow of campus life.",
                "I remained standing there on the pathway. Completely alone. Trapped in a silence so loud it threatened to deafen me, with nothing left to do but think.",
                "When the reality hit me, I didn't even know which emotion to access first. Rage flared, followed immediately by profound disappointment, then a cold, hollow sadness.",
                "This wasn't just about a failed relationship anymore. This felt like a structural breach of trust. It felt as though someone had invaded the few safe spaces I had left and dismantled them from the inside."
            ]
        }
    },
    {
        "pageNumber": 77,
        "pdfPageNumber": 77,
        "folioLabel": "70",
        "totalNumberedPages": 122,
        "sectionId": "chapter-four",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Four",
        "chapterTitle": "Unexamined Scars & The Circle of Betrayal",
        "runningHeader": "CHAPTER FOUR · UNEXAMINED SCARS & THE CIRCLE OF BETRAYAL",
        "content": {
            "paragraphs": [
                "I went into self-imposed isolation. I stopped hanging out, skipped non-essential engagements, and turned my phone off for days at a time simply to avoid hearing another voice. At night, the silence in my room was deafening. And in that quiet space, my mind ran an endless, merciless replay loop: *The day we met at church. The dates. The post service lunches. The late-night calls. The afternoon at the hangout. Her text. My cold reply. Keter. The final conversation. The betrayal.*",
                "The questions relentlessly interrogated me: *Why was I so quick to hide behind my pride that night? Why didn't I just offer reassurance? Was she reaching out from a place of deep fear that I completely misread? And is there something fundamentally broken in how I evaluate and choose partners?*",
                "That last question was the hardest to swallow, because it forced me to turn the lens away from Mumbi’s choices and focus directly on my own.",
                "Mumbi was not a villain, and I was certainly not an innocent victim. We were two broken people trying to erect a healthy structure using damaged materials we had refused to repair. She was running from a legacy of abandonment; I was operating out of pride, emotional exhaustion, and a desperate need for a quick fix to my past trauma.",
                "We had both entered the relationship expecting the other person to serve as an anchor of peace, failing to realize that peace cannot be outsourced. A relationship cannot heal what you refuse to confront within yourself. It will expose your unhealed places. It will magnify them. But it will never do your internal work for you.",
                "Later, I learned that Mumbi’s choices following our breakup were less about romance and more about a desperate, chaotic attempt to numb her pain. Her brief encounter with my friend hadn't been a grand betrayal of love, it was simply two emotionally reckless people crossing a line in a moment of vulnerability. But the damage was done. The cycle continued, leaving her"
            ]
        }
    },
    {
        "pageNumber": 78,
        "pdfPageNumber": 78,
        "folioLabel": "71",
        "totalNumberedPages": 122,
        "sectionId": "chapter-four",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Four",
        "chapterTitle": "Unexamined Scars & The Circle of Betrayal",
        "runningHeader": "CHAPTER FOUR · UNEXAMINED SCARS & THE CIRCLE OF BETRAYAL",
        "content": {
            "paragraphs": [
                "further isolated and sinking into patterns that offered momentary relief at the expense of long-term stability.",
                "I thought I knew what heartbreak felt like, but this season broke a different kind of ground. I wasn't just mourning the loss of a woman; I was mourning the collapse of my own self-trust. I questioned my discernment, my timing, and my understanding of what love actually required.",
                "I lay on my bed one evening, staring up at the plain white ceiling as darkness slowly filled the room. No music playing. No notifications lighting up my phone. Just me, trapped with the very thoughts I had spent weeks trying to outrun.",
                "I remembered the absolute conviction I had felt the first day I saw Mumbi at church. I remembered telling myself, *this is the answer.* I remembered my friends clapping my shoulder, assuring me I had finally gotten it right. I remembered how confidently I had promised to hold onto her.",
                "And here I was sitting in an empty room, back at square one.",
                "I closed my eyes and allowed myself to construct an alternate timeline.",
                "In that version, I picked up the phone the night she sent that text. I swallowed my pride. I said, \"I hear that you're hurt, let's sit down and talk.\" We met the next day. I listened to her fears of being replaced; she learned to trust my social nature without feeling threatened. We laid down clear boundaries. I learned about Otombo, Abayomi, and Deno. She learned about my past betrayals.",
                "In that world, there was no Keter. No silent revenge. No friend crossing a line that should have stayed sacred. In that world, we grew together, worked through the friction, and built the peaceful life we both wanted."
            ]
        }
    },
    {
        "pageNumber": 79,
        "pdfPageNumber": 79,
        "folioLabel": "72",
        "totalNumberedPages": 122,
        "sectionId": "chapter-four",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Four",
        "chapterTitle": "Unexamined Scars & The Circle of Betrayal",
        "runningHeader": "CHAPTER FOUR · UNEXAMINED SCARS & THE CIRCLE OF BETRAYAL",
        "content": {
            "paragraphs": [
                "For a few fleeting seconds, that imagined reality felt so real I could almost breathe it in. I found myself smiling in the dark.",
                "Then I opened my eyes.",
                "The ceiling was still there. The room was still cold and silent. Mumbi was still gone. I turned onto my side, wrapping the blanket around my shoulders. For the first time in my life, I understood that we don't only mourn the person who leaves; we mourn the unfulfilled future we had already constructed in our minds around them.",
                "As exhaustion finally began to pull me under, one quiet realization settled into the stillness: *Maybe Mumbi was not simply the 'wrong' person. Maybe I had chosen her at the wrong time, for the wrong reasons. Maybe she chose me while carrying wounds she had never given herself space to heal, and I chose her while carrying unexamined wounds of my own. We were both sincere. We both meant well. But sincerity alone has never been enough to make a broken foundation hold.*",
                "I closed my eyes, letting the darkness take over. And somewhere between the weight of regret and the slow arrival of acceptance, one persistent question remained hanging in the air: *How many times can a person pursue love with absolute sincerity before realizing that the problem may not always be the individuals they choose but the unexamined motives driving how they choose them?*"
            ]
        }
    }
]

write_ts_file('server/book/manuscript/pagesCh4.ts', 'PAGES_CH4', pages_ch4)
