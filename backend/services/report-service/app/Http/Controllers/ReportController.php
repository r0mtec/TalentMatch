<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ReportController extends Controller
{
    public function assessment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'assessment' => ['required', 'array'],
            'assessment.id' => ['required', 'uuid'],
            'assessment.request' => ['required', 'array'],
            'assessment.candidate' => ['required', 'array'],
            'assessment.requirement_results' => ['required', 'array'],
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'failed', 'error' => $validator->errors()->first()], 422);
        }

        return $this->pdfResponse(
            $this->renderAssessmentHtml($validator->validated()['assessment']),
            'assessment-report.pdf',
        );
    }

    public function comparison(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'request' => ['required', 'array'],
            'request.id' => ['required', 'uuid'],
            'assessments' => ['required', 'array'],
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => 'failed', 'error' => $validator->errors()->first()], 422);
        }

        $data = $validator->validated();

        return $this->pdfResponse(
            $this->renderComparisonHtml($data['request'], $data['assessments']),
            'comparison-report.pdf',
        );
    }

    private function pdfResponse(string $html, string $fileName)
    {
        $pdf = app('dompdf.wrapper');
        $pdf->loadHTML($html);
        $pdf->setPaper('a4');

        return response($pdf->output(), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="'.$fileName.'"');
    }

    private function renderAssessmentHtml(array $assessment): string
    {
        $closedRequirements = array_values(array_filter($assessment['requirement_results'] ?? [], fn ($item) => (bool) ($item['is_matched'] ?? false)));
        $missingRequirements = array_values(array_filter($assessment['requirement_results'] ?? [], fn ($item) => ! (bool) ($item['is_matched'] ?? false)));

        return $this->layout('Отчет по оценке', '
            <h1>Отчет по оценке</h1>
            '.$this->summaryBlock($assessment).'
            '.(($assessment['has_missing_must_requirements'] ?? false) ? '<p class="warning">Есть незакрытые must-have требования: соответствие неполное.</p>' : '').'
            <h2>Закрытые требования</h2>
            '.$this->requirementsTable($closedRequirements).'
            <h2>Отсутствующие требования</h2>
            '.$this->requirementsTable($missingRequirements).'
        ');
    }

    private function renderComparisonHtml(array $request, array $assessments): string
    {
        $rows = '';

        foreach ($assessments as $assessment) {
            $candidate = $assessment['candidate'] ?? [];
            $rows .= '<tr>'
                .'<td>'.$this->escape($candidate['display_name'] ?? 'Кандидат без имени').'</td>'
                .'<td>'.$this->escape($assessment['status'] ?? 'unknown').'</td>'
                .'<td>'.$this->number($assessment['total_score'] ?? 0).'%</td>'
                .'<td>'.$this->number($assessment['must_score'] ?? 0).'%</td>'
                .'<td>'.$this->number($assessment['nice_score'] ?? 0).'%</td>'
                .'<td>'.$this->escape($assessment['grade_match_status'] ?? 'unknown').'</td>'
                .'<td>'.$this->escape($assessment['location_match_status'] ?? 'unknown').'</td>'
                .'<td>'.$this->escape($assessment['citizenship_match_status'] ?? 'unknown').'</td>'
                .'</tr>';
        }

        if ($rows === '') {
            $rows = '<tr><td colspan="8">Оценки отсутствуют</td></tr>';
        }

        return $this->layout('Сравнение кандидатов', '
            <h1>Сравнение кандидатов</h1>
            <div class="meta">
                <div><strong>Запрос:</strong> '.$this->escape($request['title'] ?? 'Без названия').'</div>
                <div><strong>Позиция:</strong> '.$this->escape($request['position'] ?? '-').'</div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Кандидат</th>
                        <th>Статус</th>
                        <th>Итого</th>
                        <th>Must</th>
                        <th>Nice</th>
                        <th>Грейд</th>
                        <th>Локация</th>
                        <th>Гражданство</th>
                    </tr>
                </thead>
                <tbody>'.$rows.'</tbody>
            </table>
        ');
    }

    private function summaryBlock(array $assessment): string
    {
        $request = $assessment['request'] ?? [];
        $candidate = $assessment['candidate'] ?? [];

        return '
            <div class="meta">
                <div><strong>Запрос:</strong> '.$this->escape($request['title'] ?? 'Без названия').'</div>
                <div><strong>Кандидат:</strong> '.$this->escape($candidate['display_name'] ?? 'Кандидат без имени').'</div>
                <div><strong>Общий процент:</strong> '.$this->number($assessment['total_score'] ?? 0).'%</div>
                <div><strong>Must процент:</strong> '.$this->number($assessment['must_score'] ?? 0).'%</div>
                <div><strong>Nice процент:</strong> '.$this->number($assessment['nice_score'] ?? 0).'%</div>
                <div><strong>Есть незакрытые must:</strong> '.(($assessment['has_missing_must_requirements'] ?? false) ? 'да' : 'нет').'</div>
                <div><strong>Грейд:</strong> '.$this->escape($assessment['grade_match_status'] ?? 'unknown').'</div>
                <div><strong>Локация:</strong> '.$this->escape($assessment['location_match_status'] ?? 'unknown').'</div>
                <div><strong>Гражданство:</strong> '.$this->escape($assessment['citizenship_match_status'] ?? 'unknown').'</div>
            </div>
        ';
    }

    private function requirementsTable(array $items): string
    {
        if ($items === []) {
            return '<p class="muted">Нет данных</p>';
        }

        $rows = '';

        foreach ($items as $item) {
            $rows .= '<tr>'
                .'<td>'.$this->escape($item['requirement_text'] ?? '-').'</td>'
                .'<td>'.$this->escape($item['requirement_type'] ?? '-').'</td>'
                .'<td>'.$this->number($item['score_contribution'] ?? 0).'</td>'
                .'<td>'.$this->escape($item['matched_skill'] ?? '-').'</td>'
                .'<td>'.$this->escape($item['evidence_text'] ?? $item['comment'] ?? '-').'</td>'
                .'</tr>';
        }

        return '
            <table>
                <thead>
                    <tr>
                        <th>Требование</th>
                        <th>Тип</th>
                        <th>Вес</th>
                        <th>Навык</th>
                        <th>Evidence / комментарий</th>
                    </tr>
                </thead>
                <tbody>'.$rows.'</tbody>
            </table>
        ';
    }

    private function layout(string $title, string $body): string
    {
        return '<!doctype html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>'.$this->escape($title).'</title>
                <style>
                    body { font-family: DejaVu Sans, sans-serif; color: #111827; font-size: 12px; line-height: 1.45; }
                    h1 { font-size: 24px; margin: 0 0 18px; }
                    h2 { font-size: 16px; margin: 24px 0 8px; }
                    .meta { border: 1px solid #d1d5db; padding: 12px; margin-bottom: 14px; }
                    .meta div { margin-bottom: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                    th, td { border: 1px solid #d1d5db; padding: 6px; vertical-align: top; }
                    th { background: #f3f4f6; text-align: left; }
                    .muted { color: #6b7280; }
                    .warning { color: #991b1b; font-weight: bold; }
                </style>
            </head>
            <body>'.$body.'</body>
            </html>';
    }

    private function escape(mixed $value): string
    {
        return e((string) ($value ?? ''));
    }

    private function number(mixed $value): string
    {
        return rtrim(rtrim(number_format((float) $value, 2, '.', ''), '0'), '.');
    }
}
