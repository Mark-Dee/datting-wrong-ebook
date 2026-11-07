# Script to generate exact pages 1 to 122 based on the official PDF
import json
import os

pages_data = []

# Page 1 (PDF 1, Folio i)
pages_data.append({
    "pageNumber": 1,
    "pdfPageNumber": 1,
    "folioLabel": "i",
    "totalNumberedPages": 122,
    "sectionId": "title-page",
    "type": "title-page",
    "chapterTitle": "Dating Wrong",
    "runningHeader": "MARK & ALVIS PUBLISHERS",
    "paragraphs": [
        "DATING WRONG",
        "*Why We Choose the Wrong People and Repeat the Same Relationships*",
        "By\n**GERISHON WANYEKI**",
        "*“Not every person we love is the person we should choose.”*\n— Gerishon Wanyeki",
        "PUBLISHED BY\n**MARK & ALVIS**"
    ]
})

# Page 2 (PDF 2, Folio ii)
pages_data.append({
    "pageNumber": 2,
    "pdfPageNumber": 2,
    "folioLabel": "ii",
    "totalNumberedPages": 122,
    "sectionId": "copyright",
    "type": "copyright",
    "chapterTitle": "Copyright",
    "runningHeader": "COPYRIGHT & PUBLICATION NOTICE",
    "paragraphs": [
        "**Copyright**",
        "**Dating Wrong: Why We Choose the Wrong People and Repeat the Same Relationships**",
        "Copyright © 2026 by Gerishon Gichuki",
        "All rights reserved.",
        "No part of this book may be reproduced, distributed, stored in a retrieval system or transmitted in any form or by any means; electronic, mechanical, photocopying, recording or otherwise without the prior written permission of the author, except for brief quotations used in reviews, criticism or other uses permitted by applicable copyright law.",
        "This book is intended for educational, reflective and informational purposes. It is not a substitute for professional counseling, therapy or other professional relationship advice. The experiences and examples presented in this book may be based on real-life situations, personal observations or composite scenarios. Where necessary, names, identifying details and circumstances have been changed to protect privacy.",
        "The views and perspectives expressed in this book are those of the author and are intended to encourage honest reflection, emotional growth, wisdom and healthier approaches to dating and relationships.",
        "First Edition, 2026",
        "Published by Mark & Alvis",
        "ISBN 978-9914-29-399-9",
        "Printed in Kenya"
    ]
})

# Page 3 (PDF 3, Folio iii)
pages_data.append({
    "pageNumber": 3,
    "pdfPageNumber": 3,
    "folioLabel": "iii",
    "totalNumberedPages": 122,
    "sectionId": "dedication",
    "type": "dedication",
    "chapterTitle": "Dedication",
    "runningHeader": "DEDICATION",
    "paragraphs": [
        "**Dedication**",
        "A big dedication to the “forefathers” for their big contribution to the becoming of this book.",
        "To my best friends Mark and Alvis for encouraging me and making the dream come true, forever in debt.",
        "To everyone who has ever loved the wrong person.",
        "To those who gave their hearts to people who could not handle them.",
        "To those who ignored the red flags because they hoped love would make things better.",
        "To those who stayed when they should have left, left when they should have fought and returned to what had already broken them.",
        "To those who have asked themselves, *“Why do I keep ending up here?”*",
        "This book is for you.",
        "May these pages help you understand your patterns, confront your choices, heal from your past and learn to approach love with greater wisdom, courage and purpose.",
        "And above all, may you never allow a few wrong relationships to convince you that you are incapable of finding something right.",
        "**For everyone learning to love differently, this is for you.**"
    ]
})

# Page 4 (PDF 4, Folio iv)
pages_data.append({
    "pageNumber": 4,
    "pdfPageNumber": 4,
    "folioLabel": "iv",
    "totalNumberedPages": 122,
    "sectionId": "authors-note",
    "type": "authors-note",
    "chapterTitle": "Author's Note",
    "runningHeader": "AUTHOR'S NOTE",
    "paragraphs": [
        "**Author's Note**",
        "Dating Wrong was born from a simple observation: many people enter relationships with genuine intentions, yet later discover that they made choices that were not right for them.",
        "Through the stories in this book, I explore the different ways dating can go wrong through incompatibility, pride, fear, forced relationships, indecision, poor communication and many other choices we sometimes make in the name of love.",
        "This book is not written to judge anyone. It is an invitation to reflect, learn, and recognize the patterns that can lead us into relationships that were never right for us.",
        "As you read these stories, you may see someone you know, someone you once loved or perhaps yourself.",
        "My hope is that you will not only ask, **“Who was wrong?”** but also, **“What can I learn from this?”**",
        "**Gerishon Wanyeki**"
    ]
})

# Page 5 (PDF 5, Folio v)
pages_data.append({
    "pageNumber": 5,
    "pdfPageNumber": 5,
    "folioLabel": "v",
    "totalNumberedPages": 122,
    "sectionId": "introduction",
    "type": "chapter-body",
    "chapterTitle": "Introduction",
    "runningHeader": "INTRODUCTION · WHEN LOVE BECOMES THE WRONG CHOICE",
    "paragraphs": [
        "**Introduction**",
        "When Love Becomes the Wrong Choice",
        "We all have our ideas about love. We dream of finding someone who understands us, chooses us, and walks through life with us. Yet, despite our best intentions, many of us have found ourselves in relationships that eventually turned out to be the wrong choice.",
        "But what makes a relationship \"wrong\"?",
        "Sometimes it is **incompatibility** two people who care about each other but simply cannot build a life together.",
        "Sometimes it is **forcing ourselves into someone's life**, trying to make someone love us or accept a relationship they never truly wanted.",
        "Sometimes it is **pride** being too proud to apologize, express our feelings or make the first move.",
        "Sometimes it is **fear** loving someone silently and never having the courage to tell them.",
        "Sometimes it is **indecision** trying to keep two people at the same time, hoping to have the best of both worlds, only to hurt everyone involved.",
        "And sometimes, we simply ignore the signs because we want the relationship to work so badly.",
        "*Dating Wrong* is a story about people who experienced these realities and many others. The stories are different, but they share something in common: at some point, a choice was made and that choice eventually had consequences.",
        "This book is not about blaming men or women nor is it about labeling people as good or bad. It is about understanding **choices, patterns, emotions, and consequences**."
    ]
})

# Page 6 (PDF 6, Folio vi)
pages_data.append({
    "pageNumber": 6,
    "pdfPageNumber": 6,
    "folioLabel": "vi",
    "totalNumberedPages": 122,
    "sectionId": "introduction",
    "type": "chapter-body",
    "chapterTitle": "Introduction",
    "runningHeader": "INTRODUCTION · WHEN LOVE BECOMES THE WRONG CHOICE",
    "paragraphs": [
        "Because sometimes the problem isn't that we met the wrong person.",
        "Sometimes we approached the relationship the wrong way.",
        "Sometimes we chose based on attraction instead of compatibility, loneliness instead of wisdom, pride instead of vulnerability or convenience instead of commitment.",
        "And sometimes, we kept repeating the same mistake with different people.",
        "The stories in this book are therefore more than stories about failed relationships. They are opportunities to reflect. You may recognize a friend, a former partner or perhaps even yourself in these pages.",
        "The goal is not to make you afraid of love.",
        "It is to help you understand it better.",
        "Because getting the right person is important but **learning to make the right choices is just as important**.",
        "Welcome to *Dating Wrong*.",
        "**These are the stories of choices made in the name of love and the lessons they left behind.**"
    ]
})

# Page 7 (PDF 7, Folio vii)
pages_data.append({
    "pageNumber": 7,
    "pdfPageNumber": 7,
    "folioLabel": "vii",
    "totalNumberedPages": 122,
    "sectionId": "contents",
    "type": "contents",
    "chapterTitle": "Contents",
    "runningHeader": "TABLE OF CONTENTS",
    "paragraphs": [
        "Contents",
        "Copyright ........................................................................................................ ii",
        "Dedication...................................................................................................... iii",
        "Author's Note ................................................................................................ iv",
        "Introduction..................................................................................................... v",
        "CHAPTER ONE............................................................................................. 1",
        "CHAPTER TWO .......................................................................................... 20",
        "CHAPTER THREE ...................................................................................... 36",
        "CHAPTER FOUR......................................................................................... 53",
        "CHAPTER FIVE .......................................................................................... 73",
        "CHAPTER SIX............................................................................................. 89",
        "THE LESSONS WE LEARNED............................................................. 89",
        "THE CHRISTIAN STANDARD FOR DATING .................................. 102"
    ]
})

print(f"Loaded {len(pages_data)} frontmatter pages.")
