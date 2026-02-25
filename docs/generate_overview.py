#!/usr/bin/env python3
"""Generate a bold, energetic GymTrainer AI overview PDF."""

import os
from fpdf import FPDF

# Colours (R, G, B)
DARK_BG = (18, 18, 24)
ELECTRIC_BLUE = (0, 150, 255)
VIBRANT_ORANGE = (255, 107, 0)
ACCENT_RED = (255, 60, 80)
WHITE = (255, 255, 255)
LIGHT_GREY = (200, 200, 210)
MID_GREY = (140, 140, 155)
CARD_BG = (30, 30, 42)
STEP_GREEN = (0, 220, 130)


class GymTrainerPDF(FPDF):
    def dark_page(self):
        """Fill page with dark background."""
        self.set_fill_color(*DARK_BG)
        self.rect(0, 0, 210, 297, "F")

    def gradient_bar(self, y, h=4):
        """Draw a horizontal gradient accent bar."""
        w = 210
        steps = 80
        for i in range(steps):
            ratio = i / steps
            r = int(ELECTRIC_BLUE[0] + (VIBRANT_ORANGE[0] - ELECTRIC_BLUE[0]) * ratio)
            g = int(ELECTRIC_BLUE[1] + (VIBRANT_ORANGE[1] - ELECTRIC_BLUE[1]) * ratio)
            b = int(ELECTRIC_BLUE[2] + (VIBRANT_ORANGE[2] - ELECTRIC_BLUE[2]) * ratio)
            self.set_fill_color(r, g, b)
            self.rect(w * i / steps, y, w / steps + 1, h, "F")

    def rounded_rect(self, x, y, w, h, r=5):
        """Draw a filled rounded rectangle (approximation with overlapping rects)."""
        self.rect(x + r, y, w - 2 * r, h, "F")
        self.rect(x, y + r, w, h - 2 * r, "F")
        # Corners
        for cx, cy in [
            (x + r, y + r),
            (x + w - r, y + r),
            (x + r, y + h - r),
            (x + w - r, y + h - r),
        ]:
            self.ellipse(cx - r, cy - r, 2 * r, 2 * r, "F")


def build_pdf():
    pdf = GymTrainerPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=False)

    pdf.add_page()
    pdf.dark_page()

    # ── Top gradient bar ──
    pdf.gradient_bar(y=0, h=4)

    # ── Hero: Title + Tagline ──
    pdf.set_font("Helvetica", "B", 36)
    pdf.set_text_color(*WHITE)
    pdf.set_y(12)
    pdf.cell(0, 14, "GymTrainer", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(*ELECTRIC_BLUE)
    pdf.cell(0, 14, "AI", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 13)
    pdf.set_text_color(*VIBRANT_ORANGE)
    pdf.set_y(46)
    pdf.cell(0, 8, "Your AI-Powered Personal Trainer", align="C", new_x="LMARGIN", new_y="NEXT")

    # Divider
    pdf.set_draw_color(*ELECTRIC_BLUE)
    pdf.set_line_width(0.7)
    pdf.line(70, 58, 140, 58)

    # ── Feature Cards (2x2 grid, compact) ──
    features = [
        {"badge": "AI", "title": "AI Workout Planning",
         "desc": "Claude AI builds personalised\nweekly plans for your goals", "color": ELECTRIC_BLUE},
        {"badge": "MIC", "title": "Voice Set Logging",
         "desc": "Log sets completely hands-free\nwhile mid-workout", "color": VIBRANT_ORANGE},
        {"badge": "LIVE", "title": "Real-Time Streaming",
         "desc": "Watch your trainer think\nand build your plan live", "color": ACCENT_RED},
        {"badge": "UP", "title": "Progress Tracking",
         "desc": "Charts and workout history\nto see your gains", "color": STEP_GREEN},
    ]

    card_w = 85
    card_h = 42
    gap = 8
    start_x = (210 - 2 * card_w - gap) / 2
    start_y = 64

    for i, feat in enumerate(features):
        col = i % 2
        row = i // 2
        x = start_x + col * (card_w + gap)
        y = start_y + row * (card_h + gap)

        # Card background
        pdf.set_fill_color(*CARD_BG)
        pdf.rounded_rect(x, y, card_w, card_h)

        # Accent stripe on left
        pdf.set_fill_color(*feat["color"])
        pdf.rect(x, y + 6, 3, card_h - 12, "F")

        # Badge circle
        badge_cx = x + 16
        badge_cy = y + 10
        pdf.set_fill_color(*feat["color"])
        pdf.ellipse(badge_cx - 7, badge_cy - 7, 14, 14, "F")
        pdf.set_font("Helvetica", "B", 7)
        pdf.set_text_color(*DARK_BG)
        pdf.set_xy(badge_cx - 7, badge_cy - 3.5)
        pdf.cell(14, 7, feat["badge"], align="C")

        # Title
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(*WHITE)
        pdf.set_xy(x + 7, y + 18)
        pdf.cell(card_w - 14, 6, feat["title"])

        # Description
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*LIGHT_GREY)
        pdf.set_xy(x + 7, y + 25)
        pdf.multi_cell(card_w - 14, 4, feat["desc"])

    # ── How It Works (horizontal step flow) ──
    how_y = start_y + 2 * (card_h + gap) + 6

    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(*WHITE)
    pdf.set_y(how_y)
    pdf.cell(0, 8, "How It Works", align="C", new_x="LMARGIN", new_y="NEXT")

    # Divider
    pdf.set_draw_color(*VIBRANT_ORANGE)
    pdf.set_line_width(0.6)
    pdf.line(85, how_y + 11, 125, how_y + 11)

    steps = [
        ("1", "Sign Up", "Set your goals", ELECTRIC_BLUE),
        ("2", "Chat", "Talk to your AI trainer", VIBRANT_ORANGE),
        ("3", "Train", "Follow your plan", ACCENT_RED),
        ("4", "Track", "See your progress", STEP_GREEN),
    ]

    step_start_y = how_y + 16
    step_w = 42
    total_step_w = 4 * step_w
    step_start_x = (210 - total_step_w) / 2

    for i, (num, title, desc, color) in enumerate(steps):
        cx = step_start_x + i * step_w + step_w / 2

        # Circle
        pdf.set_fill_color(*color)
        pdf.ellipse(cx - 8, step_start_y, 16, 16, "F")
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(*DARK_BG)
        pdf.set_xy(cx - 8, step_start_y + 2.5)
        pdf.cell(16, 11, num, align="C")

        # Arrow connector
        if i < 3:
            arrow_x = cx + 10
            pdf.set_draw_color(*MID_GREY)
            pdf.set_line_width(0.5)
            pdf.set_dash_pattern(2, 2)
            pdf.line(arrow_x, step_start_y + 8, arrow_x + step_w - 20, step_start_y + 8)
            pdf.set_dash_pattern()

        # Title
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*WHITE)
        pdf.set_xy(cx - step_w / 2, step_start_y + 18)
        pdf.cell(step_w, 5, title, align="C")

        # Description
        pdf.set_font("Helvetica", "", 7.5)
        pdf.set_text_color(*LIGHT_GREY)
        pdf.set_xy(cx - step_w / 2, step_start_y + 23)
        pdf.cell(step_w, 4, desc, align="C")

    # ── Powered By Section ──
    powered_y = step_start_y + 35

    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(*ELECTRIC_BLUE)
    pdf.set_y(powered_y)
    pdf.cell(0, 8, "Powered By", align="C", new_x="LMARGIN", new_y="NEXT")

    tech = [
        ("Claude AI", "Anthropic's reasoning model"),
        ("React Native", "Cross-platform with Expo"),
        ("FastAPI", "Python backend"),
        ("Azure", "Cloud infrastructure"),
    ]

    tech_y = powered_y + 12
    col_w = 42
    total_w = 4 * col_w
    tech_start_x = (210 - total_w) / 2

    for i, (name, desc) in enumerate(tech):
        x = tech_start_x + i * col_w

        pdf.set_fill_color(*CARD_BG)
        pdf.rounded_rect(x + 2, tech_y, col_w - 4, 28)

        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*VIBRANT_ORANGE)
        pdf.set_xy(x + 2, tech_y + 4)
        pdf.cell(col_w - 4, 6, name, align="C")

        pdf.set_font("Helvetica", "", 7)
        pdf.set_text_color(*LIGHT_GREY)
        pdf.set_xy(x + 4, tech_y + 13)
        pdf.multi_cell(col_w - 8, 4, desc, align="C")

    # ── CTA ──
    cta_y = tech_y + 36

    pdf.set_fill_color(*ELECTRIC_BLUE)
    pdf.rounded_rect(30, cta_y, 150, 22)

    pdf.set_font("Helvetica", "B", 15)
    pdf.set_text_color(*WHITE)
    pdf.set_xy(30, cta_y + 2)
    pdf.cell(150, 9, "Get the APK & Start Training", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*DARK_BG)
    pdf.set_xy(30, cta_y + 12)
    pdf.cell(150, 6, "Ask Shoten for the latest build", align="C")

    # Bottom gradient bar
    pdf.gradient_bar(y=293, h=4)

    # ── Output ──
    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(out_dir, "GymTrainer_Overview.pdf")
    pdf.output(out_path)
    print(f"PDF generated: {out_path}")


if __name__ == "__main__":
    build_pdf()
