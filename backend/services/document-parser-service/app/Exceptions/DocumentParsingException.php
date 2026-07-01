<?php

namespace App\Exceptions;

use RuntimeException;

class DocumentParsingException extends RuntimeException
{
    public function __construct(
        string $message,
        private readonly array $warnings = [],
        private readonly int $statusCode = 422,
    ) {
        parent::__construct($message);
    }

    public function warnings(): array
    {
        return $this->warnings;
    }

    public function statusCode(): int
    {
        return $this->statusCode;
    }
}
