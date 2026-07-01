<?php

namespace App\Http\Controllers;

use App\Exceptions\DocumentParsingException;
use App\Services\DocumentParserService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Throwable;

class DocumentParserController extends Controller
{
    public function __construct(private readonly DocumentParserService $parser)
    {
    }

    public function parse(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'candidate_id' => ['required', 'uuid'],
            'file_storage_key' => ['required', 'string', 'max:2048'],
            'file_mime_type' => [
                'required',
                'string',
                Rule::in([
                    'application/pdf',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                ]),
            ],
            'original_file_name' => ['required', 'string', 'max:255'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'candidate_id' => $request->input('candidate_id'),
                'status' => 'failed',
                'plain_text' => null,
                'warnings' => ['invalid_payload'],
                'error' => $validator->errors()->first(),
            ], 422);
        }

        try {
            return response()->json($this->parser->parse($validator->validated()));
        } catch (DocumentParsingException $exception) {
            return response()->json([
                'candidate_id' => $request->input('candidate_id'),
                'status' => 'failed',
                'plain_text' => null,
                'warnings' => $exception->warnings(),
                'error' => $exception->getMessage(),
            ], $exception->statusCode());
        } catch (Throwable $exception) {
            return response()->json([
                'candidate_id' => $request->input('candidate_id'),
                'status' => 'failed',
                'plain_text' => null,
                'warnings' => ['parser_failed'],
                'error' => 'Document parser failed unexpectedly',
            ], 500);
        }
    }
}
