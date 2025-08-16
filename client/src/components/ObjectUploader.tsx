import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: ['image/*'],
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      })
      .on("complete", (result) => {
        onComplete?.(result);
        setShowModal(false);
      })
  );

  return (
    <div>
      <Button 
        onClick={() => setShowModal(true)} 
        className={buttonClassName}
        variant="outline"
        size="sm"
      >
        {children}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
        locale={{
          strings: {
            dropPasteImportBoth: 'Перетащите файлы сюда или %{browse}',
            dropPasteImportFiles: 'Перетащите файлы сюда или %{browse}',
            browse: 'выберите файлы',
            uploadComplete: 'Загрузка завершена',
            complete: 'Готово',
            uploadingXFiles: {
              0: 'Загрузка %{smart_count} файла',
              1: 'Загрузка %{smart_count} файлов',
              2: 'Загрузка %{smart_count} файлов',
            },
            xFilesSelected: {
              0: '%{smart_count} файл выбран',
              1: '%{smart_count} файла выбрано',
              2: '%{smart_count} файлов выбрано',
            },
            cancel: 'Отмена',
            done: 'Готово',
            upload: 'Загрузить',
            addMore: 'Добавить еще',
            save: 'Сохранить',
          }
        }}
      />
    </div>
  );
}