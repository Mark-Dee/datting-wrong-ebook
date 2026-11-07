import json

def write_ts_file(filepath, var_name, pages):
    code = f"import {{ BookPage }} from '../../types.ts';\n\nexport const {var_name}: BookPage[] = {json.dumps(pages, ensure_ascii=False, indent=2)};\n"
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(code)
    print(f"Wrote {len(pages)} pages to {filepath}")

# CHAPTER SIX: Pages 96 to 122 (Folio 89 to 115, 27 pages)
pages_ch6 = [
    {
        "pageNumber": 96,
        "pdfPageNumber": 96,
        "folioLabel": "89",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-start",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Lessons We Learned & The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE LESSONS WE LEARNED",
        "content": {
            "epigraph": {
                "text": "The heart is deceitful above all things, and desperately wicked: who can know it?",
                "source": "Jeremiah 17:9"
            },
            "paragraphs": [
                "**Dating Right Begins With Living Right**",
                "“The heart is deceitful above all things, and desperately wicked: who can know it?” — Jeremiah 17:9",
                "By the time I reached this point in my story, I had learned that Dating Wrong was never merely about the women I chose. It was also about the person I was when I chose them, the reasons behind my choices, the wounds I carried into relationships, and the things I was willing to overlook simply because I wanted love.",
                "Looking back at Gathoni, Sabra, Sofia, Mumbi and the relationship I imagined with Naomi, I began to see a pattern. Some relationships failed because of dishonesty. Others because of incompatibility. Others because I entered them for the wrong reasons. And one of the greatest lessons was that sometimes the person we blame for our heartbreak is only part of the story.",
                "This chapter is therefore not a courtroom. It is not a place where I put my former partners on trial. It is a mirror. The purpose of these lessons is not to make the reader suspicious of love, women, men, relationships or marriage. It is to help us become more intentional about the people we choose, the motives we carry, the boundaries we establish and the kind of people we ourselves become.",
                "The following lessons are drawn from the journey narrated throughout this book."
            ]
        }
    },
    {
        "pageNumber": 97,
        "pdfPageNumber": 97,
        "folioLabel": "90",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Lessons We Learned & The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE LESSONS WE LEARNED",
        "content": {
            "paragraphs": [
                "**1. Do Not Choose a Partner Because of Peer Pressure**",
                "My first relationship taught me a lesson that cost me my peace of mind: a romantic relationship is far too intimate a bond to be chosen by a committee of friends. When Gathoni first crossed my path, my interest in her was tentative, a quiet curiosity that might have faded naturally. But my friends saw a narrative they wanted to produce. What began as casual teasing over lunch gradually turned into persistent pressure. Their jokes grew sharper, eventually carrying a subtle undercurrent of humiliation that made me question my own maturity and masculinity. “What are you waiting for, Gerishon? Are you afraid?” I allowed their voices to become louder than my own internal compass. I asked Gathoni out not because I was conviction-bound, but because I wanted the whispers at the back of the lecture hall to stop.",
                "That was my fundamental mistake. Friends can offer perspective, but they must never make intimate decisions on your behalf. The man or woman who dates simply because their circle says, “You two look so good together,” will quickly discover that when the romantic high wears off and the hard work of building a life begins, the audience vanishes, leaving only two strangers in an empty room.",
                "*“The fear of man bringeth a snare: but whoso putteth his trust in the LORD shall be safe.”* (Proverbs 29:25)"
            ]
        }
    },
    {
        "pageNumber": 98,
        "pdfPageNumber": 98,
        "folioLabel": "91",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Lessons We Learned & The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE LESSONS WE LEARNED",
        "content": {
            "paragraphs": [
                "**2. Never Enter a Relationship for the Wrong Reason**",
                "I stepped into that first relationship partly to rescue my social standing and partly to prove a point. But a relationship cannot survive on a foundation built of “I need to demonstrate my worth.” If your primary motivation for pursuing someone is revenge against an ex, pressure from peers, fear of loneliness, competitive status, financial security, or ego validation, stop and examine your heart. The foundation you lay in the dark will dictate the strength of the structure in the storm. Before asking yourself, “Do I like this person?” ask the deeper, more unsettling question: *“Why do I want this person right now?”*",
                "**3. Do Not Ignore Red Flags Because You Finally Have What You Wanted**",
                "There were signs from the very beginning with Gathoni, quiet alerts that I deliberately chose to ignore. I watched her phone turn face-down on the wooden tabletop every time a notification lit up the screen. I felt the sudden, unprovoked emotional distance, the unexplained calls in the middle of evening study sessions, the small contradictions in her stories that never quite aligned. Yet I stayed silent. I wrapped my passivity in a holy blanket and called it trust."
            ]
        }
    },
    {
        "pageNumber": 99,
        "pdfPageNumber": 99,
        "folioLabel": "92",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Lessons We Learned & The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE LESSONS WE LEARNED",
        "content": {
            "paragraphs": [
                "In truth, what I called trust was simply the cowardice of a man who was too afraid of losing the relationship to confront what he already suspected. My pride refused to let me ask the hard questions because I didn't want my fragile dream to shatter. Red flags should never be decorated with excuses or swept under the rug of false hope. Healthy trust does not mean abandoning discernment; it means having the courage to investigate, discuss, and seek clarity when something feels wrong.",
                "**4. Communication Must Come Before Commitment**",
                "One of the greatest weaknesses in my time with Gathoni was our total inability to speak to each other with transparent honesty. We were physically present in the same spaces, but spiritually and emotionally, we were navigating entirely different worlds. A relationship without genuine communication is like a house filled with locked doors. You may share the same roof, eat at the same table, and walk side-by-side down campus paths, yet remain completely ignorant of the grief, temptation, or distance taking root inside the other person’s heart.",
                "*“Where no counsel is, the people fall: but in the multitude of counsellors there is safety.”* (Proverbs 11:14)",
                "Healthy dating requires intentional, uncomfortable conversations long before commitment is sealed. You must talk openly about your core values, your past wounds, your spiritual convictions, your financial habits, and your long-term expectations. Do not assume. Do not guess. Ask, listen, and speak the truth."
            ]
        }
    },
    {
        "pageNumber": 100,
        "pdfPageNumber": 100,
        "folioLabel": "93",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Lessons We Learned & The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE LESSONS WE LEARNED",
        "content": {
            "paragraphs": [
                "**5. Do Not Confuse Masculinity with Control or Violence**",
                "My tumultuous time with Sabra brought me face-to-face with a terrifying realization: two people can stand under the banner of love while operating on completely violent, incompatible definitions of what it means to be a partner. I learned the hard way that a man does not demonstrate strength by inflicting emotional or physical harm on the person he claims to cherish. Violence is not leadership. Intimidation is not authority. Control is not protection.",
                "*“Better to live on a corner of the roof than share a house with a quarrelsome wife.”* (Proverbs 21:9)",
                "*“Husbands, love your wives, and be not bitter against them.”* (Colossians 3:19)",
                "A healthy relationship must never, under any circumstance, normalize physical, verbal, or psychological abuse. The moment a partner demands that you prove your devotion by enduring cruelty or exercising force, you have not encountered a rough patch you have encountered a fundamental danger. Walk away from violence before it destroys your soul."
            ]
        }
    },
    {
        "pageNumber": 101,
        "pdfPageNumber": 101,
        "folioLabel": "94",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Lessons We Learned & The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE LESSONS WE LEARNED",
        "content": {
            "paragraphs": [
                "**6. Cultural Differences Should Be Understood, Not Stereotyped**",
                "Sabra and I came from vastly different cultural worlds, carrying different expressions of grief, conflict, and family expectations. At first, in the naive excitement of early romance, I believed that our feelings would automatically dissolve those boundaries. I was wrong. Love does not erase background; it exposes it. Vastly different environments can enrich a union, but they also bring underlying differences to the surface, differences in how anger is processed, how money is viewed, how families interact, and how respect is expressed. The lesson is not that people from different communities should avoid each other. The lesson is that cross-cultural relationships require intense, patient intentionality. Background should never be ignored, nor should it ever be weaponized as an excuse for disrespect, prejudice, or abuse.",
                "**7. Attraction Is Not the Same as Compatibility**",
                "Someone can possess breathtaking beauty and still be toxic for your spiritual health. Someone can carry immense charm and still be completely unequipped to walk into your future. Someone can make your heart leap in your chest while systematically dismantling your inner peace. Compatibility operates at a depth that physical chemistry can never reach."
            ]
        }
    },
    {
        "pageNumber": 102,
        "pdfPageNumber": 102,
        "folioLabel": "95",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Lessons We Learned & The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE LESSONS WE LEARNED",
        "content": {
            "paragraphs": [
                "As the excitement fades, you must ask the sober questions: Can we talk through a disagreement without destroying each other's dignity? Do our spiritual convictions align when the lights are off? Do we share a unified vision for family, faith, and purpose? Can our futures realistically fit together without one of us having to erase our divine calling? Attraction may open the door, but only compatibility can build a home inside.",
                "**8. Never Tolerate What Will Destroy Your Peace**",
                "When I finally walked away from Sabra, it took me a long time to realize that leaving did not mean I was harboring hatred. It meant I had finally discovered the necessity of a boundary.",
                "*“Keep thy heart with all diligence; for out of it are the issues of life.”* (Proverbs 4:23)",
                "There are relationships where staying requires a level of self-destruction that God never asked of you. Guarding your heart does not mean transforming into a cold, cynical stone; it means recognizing that your spiritual, emotional, and physical well-being are sacred stewardships. If a relationship consistently produces severe anxiety, chronic fear, spiritual compromise, and physical danger, then emotional attachment alone is not a holy reason to remain."
            ]
        }
    },
    {
        "pageNumber": 103,
        "pdfPageNumber": 103,
        "folioLabel": "96",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Lessons We Learned & The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE LESSONS WE LEARNED",
        "content": {
            "paragraphs": [
                "**9. Do Not Confuse Suffering with Commitment**",
                "In my youth, I held a dangerous theological misconception: I believed that the more agony I endured within a relationship, the more authentic my love must be. I mistook emotional exhaustion for Christian endurance. Staying in a toxic environment is not always faithfulness. Frequently, it is merely fear, fear of starting over, fear of public judgment, fear of loneliness, or a deep emotional dependency that has replaced faith. There is a time to fight for a relationship, but there is also a time to realize that holding on to a broken glass will only continue to make you bleed.",
                "*“To every thing there is a season, and a time to every purpose under the heaven.”* (Ecclesiastes 3:1)",
                "**10. Never Use another Person to Heal From Someone Else**",
                "This remains one of the most painful confessions of my life. I entered my relationship with Sofia while still bleeding from the wounds Sabra had inflicted, carrying the unresolved ghost of Gathoni in my shadow. Part of me pursued Sofia because I wanted someone from my past to look across the choir aisle and see that I was wanted, that I was valuable, that I had moved on. It was a lie. I was using a fragile young woman as a human bandage for my own fractured pride."
            ]
        }
    },
    {
        "pageNumber": 104,
        "pdfPageNumber": 104,
        "folioLabel": "97",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Lessons We Learned & The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE LESSONS WE LEARNED",
        "content": {
            "paragraphs": [
                "I dragged Sofia into a story she had never auditioned for, forcing her to play a role designed entirely to heal my own ego. Never make an innocent person pay for the debt left by someone who broke you. Before you take the hand of a new partner, ask yourself in the quiet presence of God: *“Am I choosing this person because I truly see them, or am I using them to quiet the noise of my past?”*",
                "**11. Heal Before You Attach**",
                "A new relationship can easily act as a powerful drug, distracting you from underlying grief. But distraction is not healing. You can stand beside someone under church lights while inwardly weeping over an unresolved past. You can post glowing photographs on social media while secretly comparing your new partner’s words to an ex’s ghost. You can declare to your friends that you are free while your heart remains locked in a prison, waiting for an apology that will never arrive.",
                "Real healing demands ruthless personal honesty. It requires quiet time, intentional solitude, absolute forgiveness, self-examination, and the willingness to lay your raw, unvarnished wounds before the Great Physician before you invite someone else to touch them.",
                "*“He healeth the broken in heart, and bindeth up their wounds.”* (Psalm 147:3)"
            ]
        }
    },
    {
        "pageNumber": 105,
        "pdfPageNumber": 105,
        "folioLabel": "98",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Lessons We Learned & The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE LESSONS WE LEARNED",
        "content": {
            "paragraphs": [
                "**12. Do Not Make Someone Your Emotional Project**",
                "When I took Sofia under my wing, part of my motivation felt noble I wanted to protect her, to guide her, to help her navigate her spiritual journey. But I drifted into a savior complex, confusing romantic attraction with a rescue mission. A life partner is not a therapeutic clinical assignment. A girlfriend or boyfriend is not a spiritual rehabilitation center. You can love someone, pray for them, and support their growth without assuming ultimate responsibility for their emotional stability or spiritual redemption. Healthy love says, “I will walk beside you in the light.” Unhealthy codependency says, “I must fix your darkness so I can feel worthy.”",
                "**13. Boundaries Are Necessary Even in Christian Relationships**",
                "One of the subtlest deceptions in the church is the belief that shared faith grants immunity from temptation, bad judgment, or emotional manipulation. Sofia and I were deeply embedded in church ministry, carrying Bibles, leading songs, and speaking the language of faith. Yet, our shared involvement in ministry did not protect us from emotional boundary breaches, blurred intentions, and chaotic fallout. Attraction does not evaporate simply because two people are sitting in a prayer room.",
                "*“Flee also youthful lusts: but follow righteousness, faith, charity, peace…”* (2 Timothy 2:22)",
                "Christian dating must ask more than, “Do we both go to church?” It must ask, “Are our daily boundaries and private interactions bringing honor to the God we serve?”"
            ]
        }
    },
    {
        "pageNumber": 106,
        "pdfPageNumber": 106,
        "folioLabel": "99",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Lessons We Learned & The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE LESSONS WE LEARNED",
        "content": {
            "paragraphs": [
                "**14. Protect Your Reputation, But Never at the Expense of Truth**",
                "When the web of confusion, accusations, and rumors reached its terrifying climax during the church tribunal involving Sofia, the entire fellowship was shaken. Friendships were strained, leaders were tested, and the line between ministry and personal conflict completely dissolved. That trial burned a crucial truth into my character: never handle interpersonal relationship conflicts through hushed gossip, selective storytelling, or emotional manipulation. When crisis strikes, pursue unvarnished truth. Seek mature, unbiased leadership. Establish clear facts with integrity. And above all, never destroy someone else's character or ministry reputation simply because you are nursing the wounds of a failed relationship.",
                "*“A false witness shall not be unpunished, and he that speaketh lies shall not escape.”* (Proverbs 19:5)",
                "*“… none shall want her mate: for my mouth it hath commanded, and his spirit it hath gathered them.”* (Isaiah 34:15)",
                "**15. Do Not Assume Heartbreak Automatically Makes You Wiser**",
                "After the disaster of the Sofia saga, I told myself that I was finally refined, that my past suffering had automatically granted me spiritual maturity and romantic wisdom. It was a dangerous delusion. Pain does not automatically produce wisdom; pain only produces wisdom when it is prayerfully examined, repented of, and processed. Left unexamined, heartbreak simply hardens into cynicism, fear, or a sophisticated ability to hide your baggage behind religious performance. After every failed connection, do not simply run to the next chapter. Sit in the quiet and ask: What did this experience expose about my own heart? Where did I compromise my convictions? What patterns am I carrying that must die before I move forward?"
            ]
        }
    },
    {
        "pageNumber": 107,
        "pdfPageNumber": 107,
        "folioLabel": "100",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Lessons We Learned & The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE LESSONS WE LEARNED",
        "content": {
            "paragraphs": [
                "**16. Do Not Idealize People Too Quickly**",
                "When Mumbi entered my life, she appeared to be the exact answer to my prayers. She was quiet, dignified, deeply pious, and entirely removed from the loud drama of campus politics. I looked at her gentle demeanor and immediately built an elaborate cathedral of expectations in my mind. I projected onto her my desperate longing for peace, permanence, and an effortless future. But I had fallen in love with an image, a fantasy constructed from my own desires rather than the actual woman sitting across from me. Give people the grace of time to reveal their true character, their fears, and their flaws. Do not build a ten-year marital fantasy around a person whose heart you have only observed for ten weeks.",
                "**17. Your Partner's Past Matters, But It Should Not Become a Weapon**",
                "Mumbi carried her own quiet history of heartbreak, abandonment fears, and unspoken grief from past connections. Because we operated in a quiet dance of polite assumptions, I never took the time to gently understand the depth of the spiritual and emotional scars she bore.",
                "*“These people draw near to Me with their mouth, and honor Me with their lips, but their heart is far from Me.”* (Matthew 15:8)",
                "Before you bind your heart to another person, seek to understand their story not to cross-examine them, not to sit in judgment, and certainly not to gather ammunition for future arguments. Understand their past so you can love them with discernment. A partner’s history can clarify their current emotional triggers, but it should never be used as a club to beat them with when disagreements arise."
            ]
        }
    },
    {
        "pageNumber": 108,
        "pdfPageNumber": 108,
        "folioLabel": "101",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Lessons We Learned & The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE LESSONS WE LEARNED",
        "content": {
            "paragraphs": [
                "**18. Do Not Let Pride Destroy Conversations That Could Save Relationships**",
                "There was a pivotal crossroad in my time with Mumbi where a single, honest conversation might have altered everything. I felt the growing distance, the unspoken questions hanging heavily in the air between us. Instead of swallowing my pride, setting down my defensive ego, and initiating a vulnerable, honest dialogue, I chose silence. I allowed my pride to convince me that if she cared, she would speak first.",
                "*“Hope deferred maketh the heart sick: but when the desire cometh, it is a tree of life.”* (Proverbs 13:12)",
                "I learned that many relationships do not end because love has completely died; they end because pride murdered communication. A quiet assumption left unaddressed will eventually rot the foundation of the strongest connection.",
                "**19. The Right Relationship Begins With Becoming the Right Person**",
                "For years, my spiritual life was dominated by a single, desperate petition: “Lord, when will you bring the right person into my life?” It was only when I was stripped of my romantic distractions that the Holy Spirit flipped the question on its head, asking: “Gerishon, are you becoming the kind of man a healthy, godly woman could safely trust with her heart?” The difference between those two questions is the difference between emotional entitlement and spiritual maturity. You cannot demand absolute honesty while living in secret compromises. You cannot demand emotional stability while nursing unchecked anger. You cannot demand spiritual devotion while offering God the leftovers of your time. The imagined standard of Naomi, a vision of peace, clear boundaries, mutual respect and honest dialogue ultimately revealed that the primary work was not finding a perfect partner, but allowing God to transform me."
            ]
        }
    },
    {
        "pageNumber": 109,
        "pdfPageNumber": 109,
        "folioLabel": "102",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE CHRISTIAN STANDARD FOR DATING",
        "content": {
            "paragraphs": [
                "**20. Do Not Make a Relationship Your Identity**",
                "Your marital or relationship status is not the measure of your standing before God or your worth as a human being. Being single is not a failure of character; dating is not an automatic badge of achievement; marriage is not the ultimate proof of spiritual completeness. A person can be married and utterly miserable, isolated in a house full of noise. A person can be single and deeply fulfilled, walking in vibrant purpose and unshakeable peace. Your identity was bought at the Cross, long before anyone called you their partner. You were valuable before anyone noticed you, you remain valuable while you wait, and your worth will remain completely intact even if human affection fades.",
                "**21. Healthy Love Gives Room for Individuality**",
                "*“For we are his workmanship, created in Christ Jesus unto good works…”* (Ephesians 2:10)",
                "The starkest contrast between my toxic past and the healthy vision I eventually understood was the concept of ownership versus partnership. In my earlier connections, love was often entangled with anxiety, possessiveness, and control a constant need to manage the other person's space, friendships, and time. But healthy love operates in the freedom of trust. A healthy partner is allowed to have their own individual walk with God, their own academic or professional ambitions, their own sacred friendships, and their own personal solitude.",
                "*“Whoso findeth a wife findeth a good thing, and obtaineth favour of the LORD.”* (Proverbs 18:22)",
                "Trust does not say, “I must monitor your every step to keep you faithful.” Trust says, “I honor who you are before God, and I do not need to imprison you to love you.”",
                "*“Favour is deceitful, and beauty is vain: but a woman that feareth the LORD, she shall be praised.”* (Proverbs 31:30)"
            ]
        }
    },
    {
        "pageNumber": 110,
        "pdfPageNumber": 110,
        "folioLabel": "103",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE CHRISTIAN STANDARD FOR DATING",
        "content": {
            "paragraphs": [
                "**22. A Healthy Partner Is Not Your Savior**",
                "In my early years, I repeatedly sought to play the Messiah in women’s lives, or sought a woman who could step onto the altar of my life and cure my deep-seated loneliness. Both expectations are idolatrous. A human partner was never designed to bear the weight of your ultimate redemption, your existential purpose, or your soul's deep healing. When you demand that a boyfriend, girlfriend, or spouse become your absolute source of joy, you guarantee heartbreak.",
                "*“Cast thy burden upon the LORD, and he shall sustain thee.”* (Psalm 55:22)",
                "A partner can stand beside you, pray with you, weep with you, and encourage your journey, but only Jesus Christ can occupy the throne of your heart.",
                "**23. Conflict Does Not Necessarily Mean Incompatibility**",
                "One of the most destructive fairy tales young Christians believe is that if a relationship is ordained by God, it will be completely free of friction, argument, or emotional distress. Compatible couples disagree. They experience moments of frustration, misunderstanding, and fatigue. The difference lies entirely in how they navigate the storm. A healthy couple can engage in a difficult discussion without resorting to character assassination, humiliation, or threats of abandonment. They know how to listen, how to offer an unreserved apology, how to grant forgiveness, and how to fight for the relationship rather than against each other.",
                "*“A soft answer turneth away wrath: but grievous words stir up anger.”* (Proverbs 15:1)"
            ]
        }
    },
    {
        "pageNumber": 111,
        "pdfPageNumber": 111,
        "folioLabel": "104",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE CHRISTIAN STANDARD FOR DATING",
        "content": {
            "paragraphs": [
                "**THE CHRISTIAN STANDARD FOR DATING**",
                "As I submitted my history to the light of Scripture, I realized that Christian dating cannot simply be a matter of warm feelings, physical attraction, or mutual convenience. It requires asking foundational questions before you yield your heart:",
                "• **Does this relationship draw me closer to God, or does it require me to compromise my walk with Him?** If a connection consistently dampens your prayer life, weakens your convictions, and leaves you feeling spiritually compromised, it is pulling you away from your true anchor.",
                "• **Does this person respect my physical, emotional, and spiritual boundaries?** Genuine love honors your convictions. A person who constantly pressures you to cross lines you have drawn before God is serving their own desires, not your soul.",
                "• **Can we communicate with radical, humble honesty?** If you cannot navigate difficult, uncomfortable truths during courtship, marriage will not magically grant you the gift of transparent speech.",
                "• **Can we resolve conflict without resorting to abuse, intimidation, or manipulation?** Peace should never be a luxury you buy with your own silence or self-respect.",
                "• **Do our core convictions and long-term values align?** Feelings fluctuate, physical youth fades, and circumstances shift. The enduring framework of a life is built entirely upon shared spiritual and moral values.",
                "• **Am I choosing this person freely in prayerful wisdom?** Not out of panic over my age, not to satisfy my friends, not to escape loneliness, not to prove a point to an ex, but because I truly believe we can honor God better together than apart."
            ]
        }
    },
    {
        "pageNumber": 112,
        "pdfPageNumber": 112,
        "folioLabel": "105",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE CHRISTIAN STANDARD FOR DATING",
        "content": {
            "paragraphs": [
                "Scripture does not view dating as a casual low-stakes game of trial and error. In the biblical worldview, romantic intimacy between a man and a woman is a deliberate path leading toward the sacred, covenantal union of marriage. Therefore, Christian dating must be governed by standards entirely distinct from the casual habits of the surrounding culture.",
                "**Pillars of Christian Courtship:**",
                "**1. Holiness and Intentionality:** Dating without a clear purpose is recreational vulnerability. If you are not in a season of life where marriage is a realistic, near-future consideration, opening your heart to deep emotional and physical intimacy is an exercise in unnecessary risk.\n*“For this is the will of God, even your sanctification, that ye should abstain from fornication: That every one of you should know how to possess his vessel in sanctification and honour; Not in the lust of concupiscence, even as the Gentiles which know not God.”* (1 Thessalonians 4:3-5)",
                "**2. Spiritual Alignment:** Being \"equally yoked\" is far more than sharing a seat in the same church auditorium or singing in the same choir. Sofia was in the church; Sabra carried a Bible; Mumbi sat on the benches every Sunday. Spiritual alignment means sharing a common surrender to the Lordship of Jesus Christ, demonstrated by a renewed mind, repentance, and the fruit of the Spirit.\n*“Be ye not unequally yoked together with unbelievers: for what fellowship hath righteousness with unrighteousness? and what communion hath light with darkness?”* (2 Corinthians 6:14)"
            ]
        }
    },
    {
        "pageNumber": 113,
        "pdfPageNumber": 113,
        "folioLabel": "106",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE CHRISTIAN STANDARD FOR DATING",
        "content": {
            "paragraphs": [
                "**3. Emotional and Physical Purity:** Purity is not merely a set of rules designed to restrict your pleasure; it is a boundary set by God to protect your soul. When you break physical boundaries outside of marriage, you blur your spiritual discernment, making it impossible to evaluate character accurately because your judgment is clouded by physical attachment.\n*“Can a man take fire in his bosom, and his clothes not be burned?”* (Proverbs 6:27)",
                "**4. Accountability and Community Wise Counsel:** A healthy relationship thrives in the light of mature Christian community. The moments where my relationships drifted into disaster were the exact moments where I isolated my choices from wise counsel operated in secrecy or ignored the quiet warnings of mature discernment-filled believers.\n*“Where no counsel is, the people fall: but in the multitude of counsellors there is safety.”* (Proverbs 11:14)",
                "***",
                "**The Red Flags We Should Never Normalize:**",
                "One of the greatest dangers in dating is the subtle temptation to justify repeated, toxic behavior as mere \"imperfection.\" An imperfect moment is a single repented error; a red flag is a persistent structural pattern of ungodly character. Here are the warning signs you must never normalize:"
            ]
        }
    },
    {
        "pageNumber": 114,
        "pdfPageNumber": 114,
        "folioLabel": "107",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE CHRISTIAN STANDARD FOR DATING",
        "content": {
            "paragraphs": [
                "• **Vocal Piety paired with an Unrenewed Temperament:** Someone who quotes Scripture fluently on Sunday but displays unbridled rage, cruelty, or physical violence during weekday disagreements.",
                "• **Secrecy and the \"Face-Down Phone\":** A partner who habitually flips their phone face down, steps away into quiet hushes, or maintains an unmonitored private world that excludes you.",
                "• **Refusal of Public Boundaries:** A companion who acts single in public spaces, indulging in overly familiar physical contact with others while expecting you to wait quietly in the background.",
                "• **Using you as an Emotional Rebound:** Someone who enters your life fresh out of a catastrophic breakup, using your presence to make an ex jealous or to soothe their unexamined wounds.",
                "• **Demanding Violence or Verbal Abuse as Proof of Passion:** Any partner who insists that love must be validated through physical hitting, shouting matches, or intense domestic warfare.",
                "• **Rapid, Unearned Intimacy (\"Love-Bombing\"):** Sweeping promises of marriage, future homes, and lifelong commitment made before your character, history, and values have been thoroughly tested by time.",
                "• **Weaponized False Allegations and Slander:** A person who systematically destroys the reputations of others whenever they are held accountable or faced with boundaries."
            ]
        }
    },
    {
        "pageNumber": 115,
        "pdfPageNumber": 115,
        "folioLabel": "108",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE CHRISTIAN STANDARD FOR DATING",
        "content": {
            "paragraphs": [
                "• **Isolation from Godly Community:** A partner who seeks to cut you off from your trusted Christian friends, spiritual mentors, or family members to make you entirely dependent on them.",
                "• **Chronic Flirtatiousness and Seeking External Validation:** An insatiable appetite for romantic attention from multiple sources, treating commitment as a temporary arrangement until a \"better\" option appears.",
                "• **A History of Unresolved Abandonments and Unanswered Vanishing Acts:** A track record of leaving people suddenly without communication, or jumping rapidly from one domestic partner to another without healing.",
                "• **Simulated Intimacy under the Guise of Art, Work, or Ministry:** Rationalizing inappropriate proximity with another person by calling it a \"rehearsal\", a \"business meeting\", or a \"counseling session\".",
                "• **Inability to Accept Responsibility or Say \"I Was Wrong\":** A partner who habitually shifts the blame for every error onto you, their past, or their environment, refusing genuine repentance.",
                "• **Financial or Emotional Parasitism:** Using your resources, status, or spiritual authority to build their life while giving nothing of substance in return.",
                "• **Mockery of Your Gentle Nature or Character:** Viewing your self-control, restraint, and refusal of sin as a \"weakness\" or lack of manhood/womanhood.",
                "• **Spiritual Manipulation:** Using spiritual language, prophecies, or pastoral authority to coerce you into emotional or physical compliance against your convictions."
            ]
        }
    },
    {
        "pageNumber": 116,
        "pdfPageNumber": 116,
        "folioLabel": "109",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE CHRISTIAN STANDARD FOR DATING",
        "content": {
            "paragraphs": [
                "**What Healthy Love Looks Like:**",
                "It is not enough to know what to avoid; you must possess a clear, biblical vision of what to build. Healthy, godly love is not an elusive, mysterious fairy tale; it leaves concrete evidence in daily life:",
                "• **Deep, Unshakeable Peace:** Healthy love does not leave you in a state of perpetual panic, wondering if you will be replaced tomorrow. It brings a profound, settled quietness to your spirit.\n*“And let the peace of God rule in your hearts, to the which also ye are called in one body; and be ye thankful”.* (Colossians 3:15)",
                "• **Emotional Self-Control and Soft Speech:** A godly partner knows how to rule over their spirit during disagreements. They do not resort to screaming, physical aggression, or malicious insult when frustrated.\n*“He that hath no rule over his own spirit is like a city that is broken down, and without walls.”* (Proverbs 25:28)",
                "• **Total Transparency and Firm Boundaries:** In a healthy relationship, there are no hidden vaults, no face-down phones, and no ambiguous \"friends\" who receive prioritized affection. Transparency is given freely, not extracted through paranoid interrogation.",
                "• **Mutual Accountable Growth:** Healthy love challenges you to draw closer to Christ. It does not pull you away from prayer, church fellowship, or academic/career diligence; it sharpens your devotion to God.\n*“Iron sharpeneth iron; so a man sharpeneth the countenance of his friend.”* (Proverbs 27:17)",
                "• **Clear, Honest Communication:** Issues are confronted swiftly, humbly, and directly. Conflict is viewed as an opportunity to understand and heal, not as a competition to win or an excuse to abandon ship."
            ]
        }
    },
    {
        "pageNumber": 117,
        "pdfPageNumber": 117,
        "folioLabel": "110",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE CHRISTIAN STANDARD FOR DATING",
        "content": {
            "paragraphs": [
                "**A Word to the Young Man:**",
                "My brother, do not measure your worth as a man by the number of women who admire you, or the conquests you can boast about to your peers. You do not gain true stature by surrounding yourself with superficial validation.",
                "*“When I was a child, I spake as a child, I understood as a child, I thought as a child: but when I became a man, I put away childish things.”* (1 Corinthians 13:11)",
                "You become a real man when you learn self-control, spiritual responsibility, emotional honesty, quiet courage, and sacrificial respect. Do not step into a relationship simply because your friends mock your singleness, or because you are afraid that remaining alone implies a lack of virility. Never treat a daughter of God as a trophy to elevate your standing, or as a temporary refuge for your unexamined loneliness.",
                "*“For what shall it profit a man, if he shall gain the whole world, and lose his own soul?”* (Mark 8:36)",
                "Choose character over public applause. Choose purpose over cheap popularity. Choose integrity over conquest. And when you finally open your heart to a woman, love her as a whole human being to be honored, protected, and served not an achievement to be displayed."
            ]
        }
    },
    {
        "pageNumber": 118,
        "pdfPageNumber": 118,
        "folioLabel": "111",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE CHRISTIAN STANDARD FOR DATING",
        "content": {
            "paragraphs": [
                "**A Word to the Young Woman:**",
                "*“Daughters of Jerusalem, I charge you: Do not arouse or awaken love until it so desires.”* (Songs of Solomon 8:4)",
                "My sister, do not confuse hyper-attentiveness with genuine love. A man calling you every hour does not automatically mean he respects your soul. A man spending money on you does not automatically mean he possesses the character required to build a covenant family. A man desiring your physical presence does not mean he is ready to cherish your spiritual destiny.",
                "*“There is no fear in love; but perfect love casteth out fear…”* (1 John 4:18)",
                "You deserve safety. You deserve honesty. You deserve clear, unmanipulative communication. You deserve a partner who honors your mind, your heart, and your boundaries. Do not remain in a chaotic, destructive environment out of a desperate fear that no one else will notice you. Your worth was determined by your Creator before the foundation of the world. Never lower your standards to accommodate a man who refuses to grow up."
            ]
        }
    },
    {
        "pageNumber": 119,
        "pdfPageNumber": 119,
        "folioLabel": "112",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE CHRISTIAN STANDARD FOR DATING",
        "content": {
            "paragraphs": [
                "**A Word to the Christian Who Is Dating:**",
                "To those currently navigating the complex waters of Christian courtship: understand that dating is not a zone exempt from the authority of God’s Word. You cannot live in disobedience Monday through Saturday and expect divine wisdom to guide your romantic choices on Sunday afternoon.",
                "*“Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.”* (Proverbs 3:5-6)",
                "Do not allow your faith to become a mere decorative ribbon wrapped around a worldly relationship. Going to church together, holding hands during a prayer, or referencing Scripture in text messages does not guarantee a godly union. Christianity must become visible in character, in self-control, in how anger is handled, and in how boundaries are maintained in the dark.",
                "*“Ye shall know them by their fruits.”* (Matthew 7:16)",
                "As Jesus declared: *“Wherefore by their fruits ye shall know them.”* Fruit does not grow overnight; it requires time, seasons, and observation. Do not rush into physical or emotional intimacy before you have taken the necessary time to observe the true fruit of a person’s private life."
            ]
        }
    },
    {
        "pageNumber": 120,
        "pdfPageNumber": 120,
        "folioLabel": "113",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE CHRISTIAN STANDARD FOR DATING",
        "content": {
            "paragraphs": [
                "**Become Before You Belong:**",
                "Here lies the single most transformative truth of my journey: Before you search for the right person, you must become the right person. For years, I approached romance with an entitlement born of self-deception. I believed that because I was a pastor’s son, a worship leader, and a polite young man, I was automatically qualified for a great love story. I was looking for a completed product in a partner while remaining a chaotic work-in-progress myself.",
                "*“Put on therefore, as the elect of God, holy and beloved, bowels of mercies, kindness, humbleness of mind, meekness, longsuffering; Forbearing one another, and forgiving one another, if any man have a quarrel against any: even as Christ forgave you, so also do ye.”* (Colossians 3:12-13)",
                "God had to take me through the dry desert of isolation to strip away my self-righteousness. He had to allow my worldly idols to collapse so that I would finally look into the mirror of His Holy Word and see my own desperate need for grace.",
                "Healthy belonging is the byproduct of personal becoming. When you are fully anchored in your identity in Christ, when your peace is not dependent on a text message, your worth is not tied to someone’s approval, and your future is resting securely in God’s hands, you date not out of empty starvation, but out of absolute overflow. You stop searching for someone to complete you, and start looking for someone with whom you can serve God’s grand purpose."
            ]
        }
    },
    {
        "pageNumber": 121,
        "pdfPageNumber": 121,
        "folioLabel": "114",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE CHRISTIAN STANDARD FOR DATING",
        "content": {
            "paragraphs": [
                "**The Dating Wrong Checklist:**",
                "Before you say \"yes\" to a relationship, or before you allow your heart to become deeply invested, sit down with this checklist in the quiet presence of God:",
                "• **The Identity Check:** Am I looking for this person to give me self-worth, validation, or an escape from loneliness, or am I already secure in Christ?",
                "• **The Spiritual Check:** Does this person demonstrate genuine, consistent fruit of the Holy Spirit in private, or merely a public form of godliness?",
                "• **The Character Check:** How does this person treat people who can do absolutely nothing for them? How do they act when they are angry or disappointed?",
                "• **The Boundary Check:** Does this person honor my physical, emotional, and spiritual boundaries without hesitation or manipulation?",
                "• **The Peace Check:** Does being around this person bring quiet stability to my soul, or does my nervous system live in perpetual crisis and anxiety?",
                "• **The Community Check:** Do my mature, trusted Christian mentors, parents, and spiritually wise friends validate this relationship, or are they expressing deep concern?",
                "• **The Purpose Check:** Beyond physical attraction and emotional comfort, do we have a shared vision for serving God’s kingdom together?"
            ]
        }
    },
    {
        "pageNumber": 122,
        "pdfPageNumber": 122,
        "folioLabel": "115",
        "totalNumberedPages": 122,
        "sectionId": "chapter-six",
        "type": "chapter-body",
        "chapterNumberLabel": "Chapter Six",
        "chapterTitle": "The Lessons We Learned & The Christian Standard for Dating",
        "runningHeader": "CHAPTER SIX · THE FINAL MIRROR",
        "content": {
            "paragraphs": [
                "**The Final Mirror**",
                "Perhaps the reader has been looking at these characters and identifying the people they know. You may have seen yourself in Gerishon. You may have seen an ex-partner in Gathoni. You may have recognized someone like Njoroge. You may have remembered the Sabra in your life. You may have been Dulman. You may have been Assmie. You may have been Mumbi. You may even have been the friend who gave advice without understanding the consequences.",
                "But before you close this chapter, look one more time into the mirror. Which character are you? Not which character resembles the person who hurt you. Not which character resembles your ex. Which character resembles you? Because the easiest thing in a relationship is to identify another person's mistake. The harder thing is to identify your own. And that is where healing begins. And I have learned that sometimes the hardest person to forgive is not the person who broke your heart. Sometimes it is yourself.",
                "But forgiveness does not mean pretending the mistakes never happened. It means allowing the mistakes to become teachers instead of permanent prisons. *“For a just man falleth seven times, and riseth up again…”* (Proverbs 24:16). That is why this book is not called “Dating Bad People.” It is called Dating Wrong. Because sometimes the wrong person is involved. Sometimes the wrong timing is involved. Sometimes the wrong motives are involved. Sometimes the wrong expectations are involved. Sometimes the wrong boundaries are involved. And sometimes, painfully, we are part of the wrong. But getting it wrong does not mean we must remain wrong. We can learn. We can heal. We can grow. We can forgive. We can choose differently.",
                "And perhaps the greatest lesson of all is this: You do not have to stop believing in love because you have experienced bad relationships. You simply have to learn how to love and how to choose better. Because love is not the problem. Sometimes, we were simply dating wrong!",
                "***",
                "THE END"
            ]
        }
    }
]

write_ts_file('server/book/manuscript/pagesCh6.ts', 'PAGES_CH6', pages_ch6)
