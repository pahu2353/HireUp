"""Create user accounts from resumes in two-tower/resumes directory."""
import os
import sys
import random
from pathlib import Path

# Get the directory of this script
script_dir = Path(__file__).parent.absolute()
backend_dir = script_dir / 'backend'

# Add backend to path
sys.path.insert(0, str(backend_dir))

import database
import pdf_utils

# Sample career objectives to randomly assign
CAREER_OBJECTIVES = [
    "Full-stack software engineer at a fast-growing startup",
    "Machine learning engineer working on cutting-edge AI",
    "Backend engineer building scalable distributed systems",
    "Frontend engineer creating beautiful user experiences",
    "Data scientist solving complex business problems",
    "Product manager driving innovation in tech",
    "Quantitative researcher at a top trading firm",
    "Mobile engineer building apps used by millions",
    "DevOps engineer optimizing cloud infrastructure",
    "Security engineer protecting critical systems",
    "Research scientist advancing the state of the art",
    "Software engineer at a leading tech company",
    "AI/ML engineer developing intelligent systems",
    "Systems engineer working on low-level performance",
    "Full-stack developer at an innovative company",
]

# Sample skills/interests to randomly assign
SKILLS_POOL = [
    "Python", "JavaScript", "TypeScript", "Java", "C++", "Go", "Rust", "Swift", "Kotlin",
    "React", "Vue.js", "Angular", "Node.js", "Express", "Django", "Flask", "FastAPI",
    "PostgreSQL", "MongoDB", "Redis", "MySQL", "DynamoDB",
    "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes",
    "Machine Learning", "Deep Learning", "NLP", "Computer Vision", "PyTorch", "TensorFlow",
    "Distributed Systems", "Microservices", "GraphQL", "REST APIs",
    "Git", "CI/CD", "Agile", "System Design", "Algorithms", "Data Structures",
    "React Native", "iOS", "Android", "Mobile Development",
    "HTML/CSS", "Tailwind", "Next.js", "Webpack",
    "Data Science", "Pandas", "NumPy", "SQL", "Data Analysis",
]


def extract_name_from_filename(filename: str) -> str:
    """
    Extract and format name from filename.
    Example: braeden_worden_20260209225540.pdf -> Braeden Worden
    """
    # Remove .pdf extension and timestamp (last underscore + numbers)
    name_part = filename.replace('.pdf', '')
    
    # Remove timestamp (digits at the end after underscore)
    parts = name_part.split('_')
    # Filter out parts that are all digits (timestamps)
    name_parts = [part for part in parts if not part.isdigit()]
    
    # Capitalize each part
    formatted_name = ' '.join(part.capitalize() for part in name_parts)
    return formatted_name


def create_email_from_name(name: str) -> str:
    """
    Create email from name.
    Example: Braeden Worden -> braedenworden@gmail.com
    """
    # Remove spaces and lowercase
    email_prefix = name.replace(' ', '').lower()
    return f"{email_prefix}@gmail.com"


def generate_random_skills(num_skills: int = 5) -> list:
    """Generate random skills from the pool."""
    return random.sample(SKILLS_POOL, min(num_skills, len(SKILLS_POOL)))


def create_users_from_resumes():
    """Create user accounts from all resumes in two-tower/resumes."""
    # Get the two-tower/resumes directory
    script_dir = Path(__file__).parent.absolute()
    resumes_dir = script_dir / 'two-tower' / 'resumes'
    
    if not resumes_dir.exists():
        print(f"❌ Directory not found: {resumes_dir}")
        return
    
    # Get all PDF files
    resume_files = list(resumes_dir.glob('*.pdf'))
    
    if not resume_files:
        print(f"❌ No PDF files found in {resumes_dir}")
        return
    
    print(f"Found {len(resume_files)} resume(s)\n")
    
    # Initialize database
    database.init_db()
    
    created_count = 0
    skipped_count = 0
    error_count = 0
    
    for resume_path in resume_files:
        filename = resume_path.name
        print(f"Processing: {filename}")
        
        try:
            # Extract name and create email
            name = extract_name_from_filename(filename)
            email = create_email_from_name(name)
            
            print(f"  Name: {name}")
            print(f"  Email: {email}")
            
            # Check if user already exists
            existing_user = database.get_user_by_email(email)
            if existing_user:
                print(f"  ⚠️  User already exists, skipping")
                skipped_count += 1
                continue
            
            # Read PDF file
            with open(resume_path, 'rb') as f:
                pdf_bytes = f.read()
            
            # Extract text from PDF
            print(f"  Extracting text from PDF...")
            resume_text = pdf_utils.extract_pdf_text(pdf_bytes)
            
            if not resume_text or len(resume_text.strip()) < 50:
                print(f"  ⚠️  Could not extract sufficient text from PDF")
                error_count += 1
                continue
            
            print(f"  Extracted {len(resume_text)} characters of text")
            
            # Generate random career objective and skills
            career_objective = random.choice(CAREER_OBJECTIVES)
            skills = generate_random_skills(random.randint(4, 8))
            
            print(f"  Career Objective: {career_objective}")
            print(f"  Skills: {', '.join(skills[:3])}...")
            
            # Create user account
            import json
            user = database.create_user(
                email=email,
                password="password",
                name=name,
                resume="",  # We're using the PDF, so this is empty
                resume_pdf=pdf_bytes,
                resume_text=resume_text,
                interests=json.dumps(skills),
                career_objective=career_objective,
            )
            
            if user:
                print(f"  ✓ Created user account")
                created_count += 1
            else:
                print(f"  ✗ Failed to create user (email may exist)")
                error_count += 1
                
        except Exception as e:
            print(f"  ✗ Error processing {filename}: {e}")
            error_count += 1
        
        print()  # Empty line between users
    
    print("=" * 60)
    print(f"📊 Summary:")
    print(f"  ✓ Created: {created_count}")
    print(f"  ⚠️  Skipped (already exists): {skipped_count}")
    print(f"  ✗ Errors: {error_count}")
    print(f"  Total processed: {len(resume_files)}")
    print()
    print("🔑 All accounts use password: password")
    print()
    
    # Show sample logins
    if created_count > 0:
        print("Sample login credentials:")
        with database.get_conn() as conn:
            users = conn.execute(
                "SELECT email, name FROM users WHERE account_type = 'user' ORDER BY created_at DESC LIMIT 5"
            ).fetchall()
            for user in users:
                print(f"  • {user['email']} / password - {user['name']}")


if __name__ == "__main__":
    create_users_from_resumes()
