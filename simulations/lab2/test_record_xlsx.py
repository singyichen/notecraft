import unittest
from pathlib import Path

from openpyxl import load_workbook


HERE = Path(__file__).resolve().parent
WORKBOOK = HERE / "measured" / "Lab2-數據記錄.xlsx"


class Lab2RecordWorkbookTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.wb = load_workbook(WORKBOOK, data_only=False)

    def test_instructions_do_not_request_a_series_current_meter(self):
        info = self.wb["說明"]
        exp1 = self.wb["實驗一 特性曲線"]

        self.assertNotIn("**", info["B5"].value)
        self.assertIn("跨 RC 兩端", exp1["C51"].value)
        self.assertNotIn("串在 VCC", exp1["C51"].value)

    def test_report_table_one_labels_current_as_milliamps_from_vrc(self):
        sheet = self.wb["交報告用 Table 1"]

        for cell in ("B6", "E6", "B15", "E15"):
            self.assertIn("V_RC / R_C", sheet[cell].value)
            self.assertIn("mA", sheet[cell].value)

    def test_ce_dc_section_keeps_100_ohm_and_1k_measurements_separate(self):
        sheet = self.wb["第二部分 CE 放大器"]

        self.assertEqual(sheet["B5"].value, "實測 R_C1 = 100 Ω")
        self.assertEqual(sheet["E5"].value, "實測 R_C1 = 1 kΩ")
        self.assertEqual(sheet["B9"].value, '=IF(OR(B7="",B8=""),"",B8-B7)')
        self.assertEqual(sheet["E9"].value, '=IF(OR(E7="",E8=""),"",E8-E7)')
        self.assertEqual(
            sheet["B10"].value,
            '=IF(OR(B8="",$C$3="",$E$3="",$E$3=0),"",($C$3-B8)/$E$3*1000)',
        )
        self.assertEqual(
            sheet["E10"].value,
            '=IF(OR(E8="",$C$3="",$G$3="",$G$3=0),"",($C$3-E8)/$G$3*1000)',
        )
        self.assertEqual(sheet["D6"].value, '=IF(OR(B6="",C6=0),"",(B6-C6)/C6)')
        self.assertEqual(sheet["G6"].value, '=IF(OR(E6="",F6=0),"",(E6-F6)/F6)')

    def test_experiment_two_formula_column_explains_instead_of_repeating(self):
        sheet = self.wb["實驗二 beta"]

        self.assertEqual(sheet["D11"].data_type, "s")
        self.assertEqual(sheet["D11"].value, "V_R1 ÷ R1 × 1000")
        self.assertEqual(sheet["D15"].value, "I_C ÷ I_B")

    def test_chart_axes_and_series_names_are_explicit(self):
        exp1_chart = self.wb["實驗一 特性曲線"]._charts[0]
        exp2_charts = self.wb["實驗二 beta"]._charts
        ce_chart = self.wb["第二部分 CE 放大器"]._charts[0]

        self.assertEqual(exp1_chart.x_axis.axPos, "b")
        self.assertEqual(exp1_chart.y_axis.axPos, "l")
        self.assertEqual(exp2_charts[0].series[0].tx.v, "實測")
        self.assertEqual(exp2_charts[0].series[1].tx.v, "LTspice")
        self.assertIsNone(exp2_charts[1].legend)
        self.assertEqual(ce_chart.series[0].tx.v, "實測")
        self.assertEqual(ce_chart.series[1].tx.v, "LTspice")

    def test_workbook_recalculates_formulas_when_opened(self):
        self.assertEqual(self.wb.calculation.calcMode, "auto")
        self.assertTrue(self.wb.calculation.fullCalcOnLoad)
        self.assertTrue(self.wb.calculation.forceFullCalc)


if __name__ == "__main__":
    unittest.main()
