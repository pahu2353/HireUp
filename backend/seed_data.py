"""Seed database with companies and job postings."""
import database
import json

# Company data: (name, website, description, size)
COMPANIES = [
    ("Jane Street", "janestreet.com", "A quantitative trading firm and liquidity provider with a focus on technology and collaborative problem solving.", "1000-5000"),
    ("Citadel", "citadel.com", "Global investment firm built on a foundation of mathematics, technology, and rigorous research.", "5000-10000"),
    ("Citadel Securities", "citadelsecurities.com", "Leading market maker across a broad array of fixed income and equity securities.", "1000-5000"),
    ("Hudson River Trading", "hudson-trading.com", "Quantitative trading firm focused on researching and developing automated trading algorithms.", "500-1000"),
    ("Two Sigma", "twosigma.com", "Technology company dedicated to finding value in the world's data.", "1000-5000"),
    ("Susquehanna International Group (SIG)", "sig.com", "Global quantitative trading firm founded on a rigorous, analytical approach to decision making.", "1000-5000"),
    ("IMC Trading", "imc.com", "Leading global trading firm powered by advanced technology and talented people.", "1000-5000"),
    ("Google", "google.com", "Technology company specializing in Internet-related services and products.", "10000+"),
    ("Meta", "meta.com", "Technology company building the future of human connection and immersive experiences.", "10000+"),
    ("Amazon", "amazon.com", "E-commerce, cloud computing, digital streaming, and artificial intelligence company.", "10000+"),
    ("Apple", "apple.com", "Technology company that designs and manufactures consumer electronics and software.", "10000+"),
    ("Netflix", "netflix.com", "Streaming service offering a wide variety of TV shows, movies, and original content.", "10000+"),
    ("Microsoft", "microsoft.com", "Technology company developing computer software, consumer electronics, and related services.", "10000+"),
    ("Jump Trading", "jumptrading.com", "Research-driven trading firm applying cutting edge technology to global markets.", "500-1000"),
    ("DRW", "drw.com", "Diversified trading firm combining innovative technology with expert execution.", "500-1000"),
    ("Optiver", "optiver.com", "Global market maker committed to pricing efficiency in financial markets.", "1000-5000"),
    ("Akuna Capital", "akunacapital.com", "Innovative trading firm specializing in derivatives market making and arbitrage.", "500-1000"),
    ("Virtu Financial", "virtu.com", "Leading financial services firm that leverages cutting edge technology.", "1000-5000"),
]

# Job templates
SWE_INTERN_JOBS = {
    "Jane Street": {
        "title": "Software Engineer Intern",
        "description": "Join our technology team to work on challenging problems in trading systems, market data, and infrastructure. You'll collaborate with traders and researchers to build highly reliable, low-latency systems.",
        "skills": ["OCaml", "Python", "C++", "Linux", "Functional Programming"],
        "location": "New York, NY",
        "salary_range": "$18k-$22k/month",
    },
    "Citadel": {
        "title": "Software Engineer Intern",
        "description": "Work on mission-critical systems that power one of the world's largest investment firms. Build scalable infrastructure and contribute to real-time trading systems.",
        "skills": ["C++", "Python", "Java", "Low Latency", "Distributed Systems"],
        "location": "Chicago, IL",
        "salary_range": "$16k-$20k/month",
    },
    "Citadel Securities": {
        "title": "Software Engineer Intern",
        "description": "Develop high-performance trading systems and analytics platforms. Work with cutting-edge technology in a fast-paced market making environment.",
        "skills": ["C++", "Python", "Market Data", "Low Latency", "Linux"],
        "location": "New York, NY",
        "salary_range": "$16k-$20k/month",
    },
    "Hudson River Trading": {
        "title": "Software Engineer Intern",
        "description": "Build algorithmic trading systems and research infrastructure. Work on problems involving big data, distributed computing, and real-time systems.",
        "skills": ["C++", "Python", "Low Latency", "Algorithms", "Data Structures"],
        "location": "New York, NY",
        "salary_range": "$17k-$21k/month",
    },
    "Two Sigma": {
        "title": "Software Engineer Intern",
        "description": "Develop data-driven trading strategies and large-scale infrastructure. Apply machine learning and advanced engineering to financial markets.",
        "skills": ["Python", "Java", "C++", "Machine Learning", "Distributed Systems"],
        "location": "New York, NY",
        "salary_range": "$16k-$20k/month",
    },
    "Susquehanna International Group (SIG)": {
        "title": "Software Engineer Intern",
        "description": "Work on quantitative trading systems and data analytics platforms. Contribute to high-performance computing and trading infrastructure.",
        "skills": ["C++", "Python", "Linux", "Low Latency", "Market Data"],
        "location": "Philadelphia, PA",
        "salary_range": "$15k-$19k/month",
    },
    "IMC Trading": {
        "title": "Software Engineer Intern",
        "description": "Develop advanced trading systems and market making algorithms. Work with cutting-edge technology in a global trading environment.",
        "skills": ["C++", "Python", "FPGA", "Low Latency", "Linux"],
        "location": "Chicago, IL",
        "salary_range": "$15k-$19k/month",
    },
}

FAANG_INTERN = {
    "Google": {
        "title": "Software Engineering Intern",
        "description": "Work on next-generation technologies that change how billions of users connect, explore, and interact with information. Projects span across search, ads, chrome, android, YouTube, and cloud.",
        "skills": ["Python", "Java", "C++", "Go", "Distributed Systems"],
        "location": "Mountain View, CA",
        "salary_range": "$8k-$12k/month",
    },
    "Meta": {
        "title": "Software Engineering Intern",
        "description": "Build technologies that help people connect, find communities, and grow businesses. Work on products used by billions including Facebook, Instagram, WhatsApp, and Reality Labs.",
        "skills": ["Python", "C++", "React", "GraphQL", "Mobile Development"],
        "location": "Menlo Park, CA",
        "salary_range": "$8k-$12k/month",
    },
    "Amazon": {
        "title": "Software Development Engineer Intern",
        "description": "Work on projects that impact millions of customers worldwide. Contribute to AWS, Alexa, Prime Video, or retail systems at massive scale.",
        "skills": ["Java", "Python", "AWS", "Distributed Systems", "Microservices"],
        "location": "Seattle, WA",
        "salary_range": "$7k-$10k/month",
    },
    "Apple": {
        "title": "Software Engineering Intern",
        "description": "Develop next-generation software for iOS, macOS, or services that delight millions of users. Work on innovative projects in a collaborative environment.",
        "skills": ["Swift", "Objective-C", "C++", "iOS", "macOS"],
        "location": "Cupertino, CA",
        "salary_range": "$7k-$11k/month",
    },
    "Netflix": {
        "title": "Software Engineering Intern",
        "description": "Build systems that deliver entertainment to 200M+ members worldwide. Work on streaming technology, recommendation systems, or content delivery.",
        "skills": ["Java", "Python", "Node.js", "AWS", "Microservices"],
        "location": "Los Gatos, CA",
        "salary_range": "$8k-$11k/month",
    },
    "Microsoft": {
        "title": "Software Engineering Intern",
        "description": "Develop software for Azure, Windows, Office, Xbox, or new innovations in AI and cloud computing. Make an impact on products used by billions.",
        "skills": ["C#", "C++", "Python", "Azure", "TypeScript"],
        "location": "Redmond, WA",
        "salary_range": "$7k-$10k/month",
    },
}

QUANT_FIRMS_INTERN = {
    "Jump Trading": {
        "title": "Software Engineer Intern",
        "description": "Work on ultra-low latency trading systems and advanced research infrastructure. Apply cutting-edge technology to solve complex problems in global markets.",
        "skills": ["C++", "Python", "FPGA", "Low Latency", "Linux"],
        "location": "Chicago, IL",
        "salary_range": "$17k-$21k/month",
    },
    "DRW": {
        "title": "Software Engineer Intern",
        "description": "Develop high-performance trading systems and risk management platforms. Work on diverse projects spanning multiple asset classes.",
        "skills": ["C++", "Python", "Java", "Low Latency", "Trading Systems"],
        "location": "Chicago, IL",
        "salary_range": "$15k-$19k/month",
    },
    "Optiver": {
        "title": "Software Engineer Intern",
        "description": "Build market making systems and real-time analytics. Work on problems involving pricing, risk, and high-frequency trading.",
        "skills": ["C++", "Python", "Low Latency", "Linux", "FPGA"],
        "location": "Chicago, IL",
        "salary_range": "$15k-$19k/month",
    },
    "Akuna Capital": {
        "title": "Software Engineer Intern",
        "description": "Develop derivatives trading systems and options pricing models. Work on high-performance computing and market data infrastructure.",
        "skills": ["C++", "Python", "Options", "Low Latency", "Linux"],
        "location": "Chicago, IL",
        "salary_range": "$14k-$18k/month",
    },
    "Virtu Financial": {
        "title": "Software Engineer Intern",
        "description": "Build electronic trading systems and market making infrastructure. Work on cutting-edge technology in global financial markets.",
        "skills": ["C++", "Python", "Java", "Low Latency", "Market Making"],
        "location": "New York, NY",
        "salary_range": "$14k-$18k/month",
    },
}

# New Grad job templates (higher salaries)
NEW_GRAD_BASE = {
    "Jane Street": {
        "title": "Software Engineer - New Grad",
        "description": "Join our technology team as a full-time software engineer. Work on critical trading infrastructure, develop new tools, and solve complex technical challenges in a collaborative environment.",
        "skills": ["OCaml", "Python", "C++", "Linux", "Functional Programming"],
        "location": "New York, NY",
        "salary_range": "$300k-$450k",
    },
    "Citadel": {
        "title": "Software Engineer - New Grad",
        "description": "Build and maintain mission-critical systems for one of the world's leading investment firms. Work on large-scale distributed systems and real-time trading platforms.",
        "skills": ["C++", "Python", "Java", "Low Latency", "Distributed Systems"],
        "location": "Chicago, IL",
        "salary_range": "$250k-$400k",
    },
    "Citadel Securities": {
        "title": "Software Engineer - New Grad",
        "description": "Develop high-performance trading systems at a leading market maker. Build ultra-low latency systems that process billions of dollars daily.",
        "skills": ["C++", "Python", "Market Data", "Low Latency", "Linux"],
        "location": "New York, NY",
        "salary_range": "$250k-$400k",
    },
    "Hudson River Trading": {
        "title": "Software Engineer - New Grad",
        "description": "Build algorithmic trading systems at scale. Work on research infrastructure, market data processing, and execution systems.",
        "skills": ["C++", "Python", "Low Latency", "Algorithms", "Data Structures"],
        "location": "New York, NY",
        "salary_range": "$250k-$400k",
    },
    "Two Sigma": {
        "title": "Software Engineer - New Grad",
        "description": "Apply engineering and data science to investment management. Build large-scale systems for data processing, trading, and research.",
        "skills": ["Python", "Java", "C++", "Machine Learning", "Distributed Systems"],
        "location": "New York, NY",
        "salary_range": "$200k-$350k",
    },
    "Susquehanna International Group (SIG)": {
        "title": "Software Engineer - New Grad",
        "description": "Develop quantitative trading systems and analytics platforms. Work on high-performance computing in a fast-paced trading environment.",
        "skills": ["C++", "Python", "Linux", "Low Latency", "Market Data"],
        "location": "Philadelphia, PA",
        "salary_range": "$200k-$325k",
    },
    "IMC Trading": {
        "title": "Software Engineer - New Grad",
        "description": "Build advanced trading technology for a global market maker. Work on low-latency systems and innovative trading strategies.",
        "skills": ["C++", "Python", "FPGA", "Low Latency", "Linux"],
        "location": "Chicago, IL",
        "salary_range": "$200k-$325k",
    },
    "Google": {
        "title": "Software Engineer - New Grad",
        "description": "Design, develop, and maintain software that runs Google's massive-scale systems. Work on products that impact billions of users worldwide.",
        "skills": ["Python", "Java", "C++", "Go", "Distributed Systems"],
        "location": "Mountain View, CA",
        "salary_range": "$150k-$230k",
    },
    "Meta": {
        "title": "Software Engineer - New Grad",
        "description": "Build innovative products and infrastructure at massive scale. Work on Facebook, Instagram, WhatsApp, or Reality Labs.",
        "skills": ["Python", "C++", "React", "GraphQL", "Mobile Development"],
        "location": "Menlo Park, CA",
        "salary_range": "$150k-$240k",
    },
    "Amazon": {
        "title": "Software Development Engineer - New Grad",
        "description": "Solve complex technical challenges at scale. Work on AWS, retail, devices, or new initiatives that delight customers.",
        "skills": ["Java", "Python", "AWS", "Distributed Systems", "Microservices"],
        "location": "Seattle, WA",
        "salary_range": "$140k-$200k",
    },
    "Apple": {
        "title": "Software Engineer - New Grad",
        "description": "Develop groundbreaking software for Apple products. Work on iOS, macOS, services, or hardware-software integration.",
        "skills": ["Swift", "Objective-C", "C++", "iOS", "macOS"],
        "location": "Cupertino, CA",
        "salary_range": "$145k-$210k",
    },
    "Netflix": {
        "title": "Software Engineer - New Grad",
        "description": "Build systems that power entertainment for millions. Work on streaming, personalization, content delivery, or studio technology.",
        "skills": ["Java", "Python", "Node.js", "AWS", "Microservices"],
        "location": "Los Gatos, CA",
        "salary_range": "$150k-$220k",
    },
    "Microsoft": {
        "title": "Software Engineer - New Grad",
        "description": "Create innovative solutions for Azure, Windows, Office, or emerging technologies. Make an impact on billions of users.",
        "skills": ["C#", "C++", "Python", "Azure", "TypeScript"],
        "location": "Redmond, WA",
        "salary_range": "$140k-$200k",
    },
    "Jump Trading": {
        "title": "Software Engineer - New Grad",
        "description": "Build ultra-low latency trading systems and research infrastructure. Apply cutting-edge technology to global markets.",
        "skills": ["C++", "Python", "FPGA", "Low Latency", "Linux"],
        "location": "Chicago, IL",
        "salary_range": "$250k-$400k",
    },
    "DRW": {
        "title": "Software Engineer - New Grad",
        "description": "Develop high-performance trading and risk management systems. Work across multiple asset classes and trading strategies.",
        "skills": ["C++", "Python", "Java", "Low Latency", "Trading Systems"],
        "location": "Chicago, IL",
        "salary_range": "$200k-$325k",
    },
    "Optiver": {
        "title": "Software Engineer - New Grad",
        "description": "Build market making systems that price and trade at scale. Work on real-time risk management and trading algorithms.",
        "skills": ["C++", "Python", "Low Latency", "Linux", "FPGA"],
        "location": "Chicago, IL",
        "salary_range": "$200k-$325k",
    },
    "Akuna Capital": {
        "title": "Software Engineer - New Grad",
        "description": "Develop derivatives trading technology and options pricing systems. Build high-performance infrastructure for market making.",
        "skills": ["C++", "Python", "Options", "Low Latency", "Linux"],
        "location": "Chicago, IL",
        "salary_range": "$175k-$300k",
    },
    "Virtu Financial": {
        "title": "Software Engineer - New Grad",
        "description": "Build electronic trading systems at a leading market maker. Work on high-frequency trading and risk management.",
        "skills": ["C++", "Python", "Java", "Low Latency", "Market Making"],
        "location": "New York, NY",
        "salary_range": "$175k-$300k",
    },
}


def create_email(company_name: str) -> str:
    """Create email from company name."""
    # Remove spaces and special chars, lowercase
    email_prefix = company_name.lower().replace(" ", "").replace("(", "").replace(")", "").replace("-", "")
    return f"{email_prefix}@{email_prefix}.com"


def seed_database():
    """Seed the database with companies and jobs."""
    print("Initializing database...")
    database.init_db()
    
    print("\nFetching existing companies...")
    company_ids = {}
    
    # Try to fetch existing companies first
    with database.get_conn() as conn:
        rows = conn.execute("SELECT id, company_name, email FROM companies").fetchall()
        for row in rows:
            company_ids[row["company_name"]] = row["id"]
            print(f"  Found: {row['company_name']}")
    
    # Create any missing companies
    print("\nCreating missing companies...")
    for name, website, description, size in COMPANIES:
        if name in company_ids:
            continue
        email = create_email(name)
        try:
            company = database.create_company(
                email=email,
                password="password",
                company_name=name,
                website=website,
                description=description,
                company_size=size,
            )
            if company:
                company_ids[name] = company["id"]
                print(f"✓ Created {name} (email: {email})")
        except Exception as e:
            print(f"✗ Failed to create {name}: {e}")
    
    print(f"\nTotal companies: {len(company_ids)}")
    
    print("\nCreating job postings...")
    job_count = 0
    
    # Create intern jobs
    all_intern_jobs = {**SWE_INTERN_JOBS, **FAANG_INTERN, **QUANT_FIRMS_INTERN}
    
    for company_name, company_id in company_ids.items():
        # Create intern job if template exists
        if company_name in all_intern_jobs:
            job_data = all_intern_jobs[company_name]
            try:
                job_id = database.create_job(
                    company_id=company_id,
                    title=job_data["title"],
                    description=job_data["description"],
                    skills=json.dumps(job_data["skills"]),
                    location=job_data["location"],
                    salary_range=job_data["salary_range"],
                )
                print(f"  ✓ {company_name}: {job_data['title']}")
                job_count += 1
            except Exception as e:
                print(f"  ✗ Failed to create intern job for {company_name}: {e}")
        
        # Create new grad job if template exists
        if company_name in NEW_GRAD_BASE:
            job_data = NEW_GRAD_BASE[company_name]
            try:
                job_id = database.create_job(
                    company_id=company_id,
                    title=job_data["title"],
                    description=job_data["description"],
                    skills=json.dumps(job_data["skills"]),
                    location=job_data["location"],
                    salary_range=job_data["salary_range"],
                )
                print(f"  ✓ {company_name}: {job_data['title']}")
                job_count += 1
            except Exception as e:
                print(f"  ✗ Failed to create new grad job for {company_name}: {e}")
    
    print(f"\n✅ Successfully created {job_count} job postings!")
    print("\n📊 Summary:")
    print(f"   Companies: {len(company_ids)}")
    print(f"   Job Postings: {job_count}")
    print("\n🔑 All company accounts use:")
    print("   Password: password")
    print("   Email format: <companyname>@<companyname>.com")


if __name__ == "__main__":
    seed_database()
