<?php

namespace App\Http\Controllers;

use App\Services\DocumentParserService;
use Illuminate\Http\Request;

class DocumentParserController extends Controller
{
    public function __construct(private readonly DocumentParserService $parser)
    {
    }

    public function parse(Request $request)
    {
        return response()->json($this->parser->parseStub($request->all()));
    }
}
