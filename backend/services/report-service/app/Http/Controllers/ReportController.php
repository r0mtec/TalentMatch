<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function assessment(Request $request)
    {
        return response('Заглушка PDF-отчета по оценке: '.$request->input('assessment_id'), 200)->header('Content-Type', 'application/pdf');
    }

    public function comparison(Request $request)
    {
        return response('Заглушка PDF-отчета по сравнению: '.$request->input('request_id'), 200)->header('Content-Type', 'application/pdf');
    }
}
