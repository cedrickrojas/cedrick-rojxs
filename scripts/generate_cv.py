"""Build the downloadable text-based CV from the supplied CV photo.

Usage: python scripts/generate_cv.py --source-image <original-cv.jpg>
Requires reportlab. The image is used only for the portrait; CV text is native PDF text.
"""

import argparse
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    Flowable, HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)


class Portrait(Flowable):
    """Clip the original CV image to its portrait within the PDF canvas."""

    width = 104
    height = 112

    def __init__(self, source):
        super().__init__()
        self.source = str(source)

    def draw(self):
        # Coordinates in the supplied 1414 x 2000 image, measured from top left.
        left, top, right, bottom = 90, 100, 360, 380
        scale = min(self.width / (right - left), self.height / (bottom - top))
        self.canv.saveState()
        clip = self.canv.beginPath()
        clip.rect(0, 0, self.width, self.height)
        self.canv.clipPath(clip, stroke=0)
        self.canv.drawImage(
            self.source, -left * scale, self.height - (2000 - top) * scale,
            width=1414 * scale, height=2000 * scale,
        )
        self.canv.restoreState()


def build(source, output):
    body = ParagraphStyle(
        'CVBody', fontName='Helvetica', fontSize=10, leading=14,
        textColor=colors.HexColor('#252525'), alignment=TA_LEFT,
    )
    heading = ParagraphStyle(
        'CVSection', parent=body, fontName='Helvetica-Bold', fontSize=12,
        leading=16, spaceBefore=13, spaceAfter=4, keepWithNext=True,
    )
    subheading = ParagraphStyle(
        'CVSubheading', parent=body, fontName='Helvetica-Bold',
        spaceBefore=7, spaceAfter=3, keepWithNext=True,
    )
    bullet = ParagraphStyle(
        'CVBullet', parent=body, fontSize=9.5, leading=13,
        leftIndent=10, firstLineIndent=-8,
    )
    name = ParagraphStyle(
        'CVName', parent=body, fontName='Helvetica-Bold', fontSize=19,
        leading=23, spaceAfter=8,
    )
    role = ParagraphStyle('CVRole', parent=body, fontSize=12, spaceAfter=14)
    contact = ParagraphStyle('CVContact', parent=body, fontSize=9, leading=14)
    story = []

    def p(text, style=body):
        return Paragraph(text, style)

    def section(title):
        story.extend([
            p(title, heading),
            HRFlowable(width='100%', thickness=0.7, color=colors.HexColor('#444444'), spaceAfter=7),
        ])

    contact_details = [
        p('MAC CEDRICK H. ROJAS', name),
        p('BSIT STUDENT', role),
        p('951 278 3005 &nbsp; | &nbsp; <link href="mailto:rojascedrick543@gmail.com">rojascedrick543@gmail.com</link>', contact),
        p('<link href="https://cedrick-rojxs.vercel.app">cedrick-rojxs.vercel.app</link>', contact),
    ]
    header = Table([[Portrait(source), '', contact_details]], colWidths=[104, 18, 393.27])
    header.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.extend([header, Spacer(1, 9)])

    section('ABOUT ME')
    story.append(p(
        'A 4th-year Bachelor of Science in Information Technology student seeking an OJT opportunity '
        'to gain practical experience and further develop my technical skills. I have experience in '
        'web development, database management, and IoT systems through academic and project-based '
        'work. I am a motivated, adaptable, and hardworking individual who is eager to learn, '
        'contribute to a professional team, and grow in the IT industry.'
    ))

    section('EDUCATION')
    education = Table([
        [p('TERTIARY<br/>2023 - PRESENT'), p('<b>MINDORO STATE UNIVERSITY (CALAPAN CITY CAMPUS)</b><br/>Bachelor of Science in Information Technology')],
        [p('SECONDARY<br/>2017 - 2023'), p('<b>MANAGPI NATIONAL HIGH SCHOOL</b>')],
        [p('PRIMARY<br/>2009 - 2017'), p('<b>CAMANSIHAN ELEMENTARY SCHOOL</b>')],
    ], colWidths=[137, 378.27])
    education.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(education)

    section('EXPERIENCE')
    story.append(p('Web Development', subheading))
    for text in (
        'Developed responsive websites using HTML, CSS, and JavaScript.',
        'Built web applications using PHP and React.js.',
        'Implemented login systems, CRUD operations, and form validation in web-based projects.',
    ):
        story.append(p('&bull; ' + text, bullet))
    story.append(p('Database Management', subheading))
    for text in (
        'Designed and managed MySQL databases for web applications.',
        'Created tables, relationships, and SQL queries for data management.',
        'Integrated databases with web applications for data storage, retrieval, and updating.',
    ):
        story.append(p('&bull; ' + text, bullet))

    section('SKILLS')
    skills = Table([
        [p('&bull; HTML, CSS, JAVASCRIPT', bullet), p('&bull; PYTHON', bullet), p('&bull; MYSQL &amp; DATABASE', bullet)],
        [p('&bull; PHP', bullet), p('&bull; GIT &amp; GITHUB', bullet), p('&bull; REACT.JS', bullet)],
    ], colWidths=[185, 145, 185.27])
    skills.setStyle(TableStyle([
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(skills)

    section('PROJECTS')
    story.append(p('PinyaSense: Smart IoT and AI Monitoring System', subheading))
    story.append(p(
        'Developed a smart monitoring system using IoT sensors, database integration, '
        'and a web-based platform.'
    ))

    output.parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(output), pagesize=A4, rightMargin=40, leftMargin=40,
        topMargin=36, bottomMargin=36, title='Mac Cedrick H. Rojas - CV',
        author='Mac Cedrick H. Rojas', pageCompression=0,
    )
    document.build(story)
    if document.page != 1:
        raise RuntimeError(f'Expected a one-page CV; generated {document.page} pages.')
    print(f'Created one-page text-based PDF: {output}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-image', type=Path, required=True)
    args = parser.parse_args()
    build(args.source_image, Path(__file__).resolve().parents[1] / 'assets' / 'Cedrick-Rojas-CV.pdf')
