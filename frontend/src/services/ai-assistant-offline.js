// OFFLINE AI Resume Assistant - No Internet Required!
// Uses local templates and smart matching for resume help

class OfflineAIAssistant {
  constructor() {
    this.conversationHistory = [];
    this.currentResume = '';
    this.currentJobDescription = '';
  }

  setResumeContent(content) {
    this.currentResume = content;
  }

  setJobDescription(description) {
    this.currentJobDescription = description;
  }

  // Main entry point - responds to user messages
  async sendMessage(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Add to history
    this.conversationHistory.push({ role: 'user', content: userMessage });
    
    let response = '';
    
    // Detect intent and respond
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('help')) {
      response = this.getWelcomeResponse();
    }
    else if (lowerMessage.includes('tailor') || lowerMessage.includes('customize') || lowerMessage.includes('modify')) {
      response = this.getTailoringAdvice();
    }
    else if (lowerMessage.includes('cover letter') || lowerMessage.includes('coverletter')) {
      response = this.getCoverLetterTemplate();
    }
    else if (lowerMessage.includes('suggestion') || lowerMessage.includes('improve') || lowerMessage.includes('review') || lowerMessage.includes('feedback')) {
      response = this.getResumeSuggestions();
    }
    else if (lowerMessage.includes('skill') || lowerMessage.includes('keyword')) {
      response = this.getKeywordSuggestions();
    }
    else if (lowerMessage.includes('format') || lowerMessage.includes('structure') || lowerMessage.includes('layout')) {
      response = this.getFormattingTips();
    }
    else if (lowerMessage.includes('experience') || lowerMessage.includes('work history')) {
      response = this.getExperienceTips();
    }
    else if (lowerMessage.includes('education') || lowerMessage.includes('degree')) {
      response = this.getEducationTips();
    }
    else if (lowerMessage.includes('action verb') || lowerMessage.includes('action word')) {
      response = this.getActionVerbs();
    }
    else if (lowerMessage.includes('template') || lowerMessage.includes('example')) {
      response = this.getResumeTemplate();
    }
    else if (lowerMessage.includes('ats') || lowerMessage.includes('applicant tracking')) {
      response = this.getATSTips();
    }
    else {
      response = this.getGeneralAdvice(userMessage);
    }
    
    // Add response to history
    this.conversationHistory.push({ role: 'assistant', content: response });
    
    return {
      success: true,
      message: response
    };
  }

  getWelcomeResponse() {
    return `**Hi! I'm your Offline Resume Assistant** 🤖

I can help you with:

📝 **Resume Tailoring** - Ask me to "tailor my resume" and I'll give you specific tips

✉️ **Cover Letters** - Say "create a cover letter" for templates

💡 **Suggestions** - Ask for "suggestions" to improve your resume

🔑 **Keywords** - Ask about "skills" or "keywords" for your industry

📋 **Formatting** - Ask about "format" or "structure" tips

🎯 **ATS Tips** - Ask about "ATS" for applicant tracking system tips

**Just type what you need help with!**

*Note: This assistant works 100% offline - no internet required!*`;
  }

  getTailoringAdvice() {
    const hasResume = this.currentResume && this.currentResume.trim().length > 50;
    
    let response = `**Resume Tailoring Tips** 📝

Here's how to tailor your resume for any job:

**1. Match Keywords**
- Read the job description carefully
- Identify key skills and requirements
- Include exact words from the posting
- Place most relevant skills prominently

**2. Customize Your Summary**
- Lead with the job title they're hiring for
- Highlight your most relevant experience
- Show immediate value you'd bring

**3. Reorder Your Experience**
- Put most relevant experience first
- Expand relevant roles, condense others
- Use similar language to the job posting

**4. Quantify Achievements**
- Add numbers wherever possible
- "Increased sales by 25%"
- "Managed team of 8 developers"
- "Reduced costs by $50,000 annually"

**5. Skills Section**
- List skills from job requirements first
- Group by category (Technical, Soft Skills)
- Remove irrelevant skills`;

    if (hasResume) {
      response += `\n\n**Looking at your resume:**\n- I see you have content in your editor\n- Consider adding more quantifiable achievements\n- Make sure your skills match your target job\n- Use action verbs to start each bullet point`;
    }

    return response;
  }

  getCoverLetterTemplate() {
    return `**Cover Letter Template** ✉️

Here's a professional cover letter structure:

\`\`\`latex
\\documentclass{letter}
\\usepackage[margin=1in]{geometry}

\\begin{document}

\\begin{letter}{Hiring Manager\\\\
Company Name\\\\
Company Address}

\\opening{Dear Hiring Manager,}

% PARAGRAPH 1: Hook & Position
I am writing to express my interest in the [Job Title] position at [Company]. With [X years] of experience in [relevant field], I am excited about the opportunity to contribute to your team.

% PARAGRAPH 2: Why You're Qualified
In my current role at [Company], I have [specific achievement with numbers]. I also [another relevant accomplishment]. These experiences have prepared me well for the challenges of this role.

% PARAGRAPH 3: Why This Company
I am particularly drawn to [Company] because of [specific reason - mission, product, culture]. I believe my background in [relevant skill] aligns perfectly with your needs.

% PARAGRAPH 4: Call to Action
I would welcome the opportunity to discuss how my experience can benefit [Company]. Thank you for considering my application.

\\closing{Sincerely,}

Your Name

\\end{letter}
\\end{document}
\`\`\`

**Tips:**
- Keep it to one page
- Customize for each application
- Show enthusiasm for the specific company
- Include specific achievements with numbers
- Proofread carefully!`;
  }

  getResumeSuggestions() {
    const hasResume = this.currentResume && this.currentResume.trim().length > 50;
    
    let response = `**Resume Improvement Suggestions** 💡

**General Best Practices:**

✅ **Content**
- Start bullets with strong action verbs
- Include quantifiable achievements (numbers, %, $)
- Focus on impact, not just duties
- Remove outdated or irrelevant experience

✅ **Format**
- Keep to 1-2 pages
- Use consistent formatting
- Leave adequate white space
- Use professional fonts (11-12pt)

✅ **Language**
- Avoid "I" and "my"
- Use past tense for previous jobs
- Present tense for current role
- Remove filler words ("various", "multiple")

✅ **Technical**
- Save as PDF for submissions
- Test ATS compatibility
- Proofread multiple times
- Have someone else review it`;

    if (hasResume) {
      const content = this.currentResume.toLowerCase();
      response += `\n\n**Based on your resume:**\n`;
      
      // Check for common issues
      if (!content.includes('%') && !content.includes('percent')) {
        response += `\n⚠️ **Add metrics:** Your resume could benefit from more quantifiable achievements (percentages, dollar amounts, team sizes)`;
      }
      
      if (content.includes('responsible for') || content.includes('duties include')) {
        response += `\n⚠️ **Use action verbs:** Replace "responsible for" with action verbs like "Led", "Managed", "Developed"`;
      }
      
      if (!content.includes('\\section')) {
        response += `\n💡 **Add sections:** Consider organizing with clear sections (Experience, Skills, Education)`;
      }
      
      if (content.length < 500) {
        response += `\n📝 **Add more content:** Your resume seems short. Consider adding more details about your achievements`;
      }
    }

    return response;
  }

  getKeywordSuggestions() {
    return `**Keywords & Skills Tips** 🔑

**How to Identify Keywords:**
1. Read the job description 3+ times
2. Highlight recurring terms
3. Note required vs. preferred skills
4. Look at similar job postings

**Common Technical Keywords by Field:**

**Software Engineering:**
Python, JavaScript, React, Node.js, AWS, Docker, Kubernetes, CI/CD, Agile, REST API, SQL, Git, Machine Learning, TypeScript, Go, Java, Microservices

**Data Science:**
Python, R, SQL, Machine Learning, TensorFlow, PyTorch, Pandas, Statistical Analysis, Data Visualization, Deep Learning, NLP, A/B Testing

**Product Management:**
Roadmap, Agile, Scrum, User Research, PRD, KPIs, Stakeholder Management, A/B Testing, Go-to-Market, Product Strategy

**Marketing:**
SEO, SEM, Google Analytics, Content Strategy, Social Media, Email Marketing, CRM, Marketing Automation, Brand Management

**Finance:**
Financial Modeling, Excel, Bloomberg, SQL, Risk Management, Valuation, FP&A, Forecasting, GAAP

**Soft Skills (Universal):**
Leadership, Communication, Problem-solving, Collaboration, Project Management, Strategic Thinking, Adaptability

**Tip:** Mirror the exact keywords from the job posting in your resume!`;
  }

  getFormattingTips() {
    return `**Resume Formatting Tips** 📋

**Best Practices:**

**1. Length**
- Entry level: 1 page
- Mid-career: 1-2 pages
- Senior/Executive: 2 pages max
- Academic CV: Can be longer

**2. Margins & Spacing**
- Margins: 0.5" to 1"
- Line spacing: 1.0 to 1.15
- Section spacing: consistent gaps

**3. Font Choices**
- Professional fonts: Arial, Calibri, Garamond
- Size: 10-12pt for body, 14-16pt for headers
- Avoid: Comic Sans, decorative fonts

**4. Section Order**
- Contact Information (top)
- Summary/Objective (optional)
- Experience (reverse chronological)
- Education
- Skills
- Certifications (if relevant)

**5. Bullet Points**
- 3-5 bullets per role
- Start with action verbs
- One line each when possible
- Most impressive achievements first

**LaTeX Specific:**
\`\`\`latex
% Good section formatting:
\\section*{Experience}
\\textbf{Job Title} | Company Name | Date Range
\\begin{itemize}
  \\item Achievement with quantifiable result
  \\item Another impactful accomplishment
\\end{itemize}
\`\`\``;
  }

  getExperienceTips() {
    return `**Experience Section Tips** 💼

**Format Each Role:**
\`\`\`
Job Title | Company Name | Location | Dates
• Achievement 1 (with metrics)
• Achievement 2 (with impact)
• Achievement 3 (with scope)
\`\`\`

**Strong Action Verbs:**
- Leadership: Led, Managed, Directed, Supervised
- Achievement: Achieved, Delivered, Exceeded, Surpassed  
- Creation: Built, Created, Designed, Developed
- Improvement: Improved, Enhanced, Optimized, Streamlined
- Analysis: Analyzed, Evaluated, Assessed, Researched

**The STAR Method for Bullets:**
- **S**ituation: Brief context
- **T**ask: What you needed to do
- **A**ction: What you did
- **R**esult: Quantifiable outcome

**Examples:**

❌ Weak: "Responsible for managing team projects"

✅ Strong: "Led cross-functional team of 8 engineers to deliver $2M product launch 2 weeks ahead of schedule"

❌ Weak: "Helped with sales"

✅ Strong: "Increased quarterly sales by 35% ($150K) through new client acquisition strategy"`;
  }

  getEducationTips() {
    return `**Education Section Tips** 🎓

**What to Include:**
- Degree name and major
- University name
- Graduation date (or expected)
- GPA (if 3.5+ or required)
- Relevant honors/awards
- Relevant coursework (if recent grad)

**Format:**
\`\`\`latex
\\section*{Education}
\\textbf{Bachelor of Science in Computer Science} \\\\
University Name, City, State \\\\
Graduation: May 2023 | GPA: 3.8/4.0 \\\\
\\textit{Relevant Coursework:} Data Structures, Machine Learning, Databases
\`\`\`

**Tips by Experience Level:**

**Recent Graduates:**
- Put education near the top
- Include relevant coursework
- Add academic projects
- List GPA if strong (3.5+)

**Experienced Professionals:**
- Put education after experience
- Just degree, school, year
- Skip GPA unless exceptional
- Focus on professional achievements

**Certifications:**
- List after education
- Include date obtained
- Note expiration if applicable`;
  }

  getActionVerbs() {
    return `**Power Action Verbs for Resumes** 💪

**Leadership:**
Led, Directed, Managed, Supervised, Coordinated, Headed, Oversaw, Chaired, Spearheaded

**Achievement:**
Achieved, Accomplished, Attained, Exceeded, Surpassed, Delivered, Completed, Earned

**Creation:**
Created, Developed, Designed, Built, Established, Founded, Implemented, Initiated, Launched

**Improvement:**
Improved, Enhanced, Optimized, Streamlined, Upgraded, Transformed, Modernized, Revitalized

**Analysis:**
Analyzed, Assessed, Evaluated, Examined, Identified, Investigated, Researched, Reviewed

**Communication:**
Presented, Negotiated, Collaborated, Influenced, Persuaded, Authored, Communicated, Conveyed

**Technical:**
Programmed, Engineered, Automated, Configured, Integrated, Debugged, Deployed, Architected

**Problem-Solving:**
Resolved, Solved, Troubleshot, Diagnosed, Addressed, Rectified, Fixed, Remedied

**Growth:**
Increased, Expanded, Grew, Accelerated, Maximized, Generated, Boosted, Amplified

**Efficiency:**
Reduced, Decreased, Minimized, Consolidated, Simplified, Eliminated, Cut, Lowered

**Use these at the start of every bullet point!**`;
  }

  getResumeTemplate() {
    return `**LaTeX Resume Template** 📄

Here's a clean, ATS-friendly template:

\`\`\`latex
\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\setlist{noitemsep}

\\begin{document}

% HEADER
\\begin{center}
{\\LARGE \\textbf{Your Name}}\\\\[4pt]
email@example.com | (555) 123-4567 | linkedin.com/in/yourname | City, State
\\end{center}

% EXPERIENCE
\\section*{Experience}
\\textbf{Senior Software Engineer} \\hfill Company Name\\\\
\\textit{City, State} \\hfill Jan 2022 -- Present
\\begin{itemize}
  \\item Led development of microservices platform serving 1M+ daily users
  \\item Reduced API response time by 40\\% through caching optimization
  \\item Mentored team of 4 junior engineers
\\end{itemize}

\\textbf{Software Engineer} \\hfill Previous Company\\\\
\\textit{City, State} \\hfill Jun 2019 -- Dec 2021
\\begin{itemize}
  \\item Built React frontend used by 50K+ customers
  \\item Implemented CI/CD pipeline reducing deploy time by 60\\%
\\end{itemize}

% EDUCATION
\\section*{Education}
\\textbf{B.S. Computer Science} \\hfill University Name\\\\
\\textit{City, State} \\hfill 2019

% SKILLS
\\section*{Skills}
\\textbf{Languages:} Python, JavaScript, TypeScript, Java\\\\
\\textbf{Technologies:} React, Node.js, AWS, Docker, PostgreSQL

\\end{document}
\`\`\`

Copy this template and customize it for your experience!`;
  }

  getATSTips() {
    return `**ATS (Applicant Tracking System) Tips** 🎯

**What is ATS?**
Software that scans resumes before humans see them. 75% of resumes are rejected by ATS!

**How to Beat ATS:**

**1. Use Standard Formatting**
- Simple, clean layout
- Standard section headers (Experience, Education, Skills)
- No tables, columns, or graphics
- No headers/footers

**2. Use Keywords**
- Match exact words from job posting
- Include both spelled out and acronyms (e.g., "Artificial Intelligence (AI)")
- Use standard job titles

**3. File Format**
- PDF usually safe
- .docx as backup
- Never use images of text

**4. Avoid These:**
- Fancy fonts or colors
- Images, logos, or graphics
- Text boxes or tables
- Creative layouts

**5. Section Headers to Use:**
- Experience / Work Experience
- Education
- Skills
- Summary / Professional Summary
- Certifications

**6. Test Your Resume:**
- Copy/paste into plain text to check formatting
- Use online ATS checkers
- Have a simple and creative version

**Remember:** Even if you pass ATS, a human will read your resume next. Make it compelling!`;
  }

  getGeneralAdvice(userMessage) {
    return `I understand you're asking about: "${userMessage}"

Here are some things I can help you with:

**📝 Resume Writing:**
- "How do I tailor my resume?"
- "Give me suggestions for my resume"
- "What action verbs should I use?"
- "Show me a resume template"

**✉️ Cover Letters:**
- "Create a cover letter"
- "Cover letter tips"

**🔑 Skills & Keywords:**
- "What keywords should I use?"
- "Skills for software engineering"

**📋 Formatting:**
- "How should I format my resume?"
- "Resume structure tips"

**🎯 ATS:**
- "ATS tips"
- "How to beat applicant tracking systems"

**Just ask me any of these questions!**

*Note: I'm an offline assistant - I work 100% locally without internet!*`;
  }

  getSuggestions(resumeContent) {
    this.setResumeContent(resumeContent);
    return this.sendMessage("Give me suggestions for my resume");
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  reset() {
    this.conversationHistory = [];
    this.currentResume = '';
    this.currentJobDescription = '';
  }
}

// Export singleton
export const offlineAIAssistant = new OfflineAIAssistant();

